from collections import defaultdict

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.commerce.catalog.models import Product
from apps.commerce.catalog.variant_options import variant_option_values
from apps.workspaces.policy import WorkspacePermission
from apps.workspaces.services import require_membership

from .catalog_sync import (
    _canonical_listing,
    _legacy_family_options,
    _localized_name,
    _replace_managed_listing_options,
    _structured_family_options,
    _unique_listing_slug,
)
from .models import WebsiteListing, WebsiteVariant
from .services import get_site_for_user, get_variant_for_user


def _require_commerce_view(*, user, business_id):
    return require_membership(
        user=user,
        business_id=business_id,
        permission=WorkspacePermission.VIEW_COMMERCE,
    )


def list_commerce_catalog(*, user, business_id, site_id):
    site = get_site_for_user(user=user, business_id=business_id, site_id=site_id)
    _require_commerce_view(user=user, business_id=business_id)
    products = list(
        Product.objects.filter(business=site.business, is_active=True)
        .select_related("family")
        .order_by("family__name", "name", "variant", "sku", "id")
    )
    linked = {
        variant.commerce_product_id: variant
        for variant in WebsiteVariant.objects.filter(
            listing__site=site,
            commerce_product_id__in=[product.id for product in products],
        ).select_related("listing")
    }
    return [
        {
            "id": product.id,
            "family_id": product.family_id,
            "family_name": product.family.name if product.family is not None else "",
            "name": product.name,
            "sku": product.sku,
            "brand": product.brand,
            "variant": product.variant,
            "variant_options": product.variant_options,
            "tracking_mode": product.tracking_mode,
            "linked": product.id in linked,
            "website_listing_id": linked[product.id].listing_id if product.id in linked else None,
            "website_variant_id": linked[product.id].id if product.id in linked else None,
        }
        for product in products
    ]


def _expand_selected_products(*, business, product_ids):
    requested = list(
        Product.objects.filter(
            business=business,
            is_active=True,
            id__in=product_ids,
        ).select_related("family")
    )
    if len(requested) != len(set(product_ids)):
        raise ValidationError(
            {"product_ids": "Every selected Commerce product must be active and belong to this workspace."},
            code="website_commerce_product_invalid",
        )
    family_ids = {product.family_id for product in requested if product.family_id is not None}
    familyless_ids = {product.id for product in requested if product.family_id is None}
    query = Product.objects.filter(business=business, is_active=True)
    products = list(
        query.filter(family_id__in=family_ids).select_related("family")
        if family_ids
        else []
    )
    if familyless_ids:
        products.extend(
            Product.objects.filter(
                business=business,
                is_active=True,
                id__in=familyless_ids,
            ).select_related("family")
        )
    return sorted(
        {product.id: product for product in products}.values(),
        key=lambda product: (
            product.family.name if product.family is not None else product.name,
            product.name,
            product.variant,
            product.sku,
            str(product.id),
        ),
    )


@transaction.atomic
def import_commerce_products(*, actor, business_id, site_id, product_ids):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    _require_commerce_view(user=actor, business_id=business_id)
    products = _expand_selected_products(business=site.business, product_ids=product_ids)

    grouped = defaultdict(list)
    for product in products:
        key = ("family", product.family_id) if product.family_id else ("product", product.id)
        grouped[key].append(product)

    created_listings = 0
    created_variants = 0
    linked_existing_variants = 0

    for group_products in grouped.values():
        first = group_products[0]
        family = first.family
        display_name = family.name if family is not None else first.name
        brand = (family.brand if family is not None else first.brand) or ""
        structured_options = _structured_family_options(group_products)
        structured_mode = structured_options is not None
        family_options = structured_options if structured_mode else _legacy_family_options(group_products)
        managed_option_ids = {
            "variant",
            *(option["id"] for option in (structured_options or [])),
        }

        listing, _linked_listings = _canonical_listing(
            site=site,
            products=group_products,
            display_name=display_name,
        )
        if listing is None:
            listing = WebsiteListing.objects.create(
                site=site,
                slug=_unique_listing_slug(site, display_name),
                title=_localized_name(display_name),
                brand=brand,
                options=family_options,
                is_published=False,
            )
            created_listings += 1
        elif structured_mode:
            next_options = _replace_managed_listing_options(
                listing.options,
                managed_option_ids,
                family_options,
            )
            if next_options != listing.options:
                listing.options = next_options
                listing.save(update_fields=["options", "updated_at"])
        elif not listing.options and family_options:
            listing.options = family_options
            listing.save(update_fields=["options", "updated_at"])

        for product in group_products:
            existing = WebsiteVariant.objects.filter(
                listing__site=site,
                commerce_product=product,
            ).first()
            product_options = (
                variant_option_values(product.variant_options)
                if structured_mode
                else (
                    {}
                    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL
                    else ({"variant": product.variant} if product.variant else {})
                )
            )
            if existing is not None:
                linked_existing_variants += 1
                changed = []
                if existing.listing_id != listing.id:
                    existing.listing = listing
                    changed.append("listing")
                if structured_mode:
                    current_options = existing.options if isinstance(existing.options, dict) else {}
                    preserved = {
                        key: value
                        for key, value in current_options.items()
                        if key not in managed_option_ids
                    }
                    next_options = {**preserved, **product_options}
                    if next_options != current_options:
                        existing.options = next_options
                        changed.append("options")
                if changed:
                    existing.save(update_fields=[*changed, "updated_at"])
                continue

            WebsiteVariant.objects.create(
                listing=listing,
                sku=product.sku,
                options=product_options,
                website_price=None,
                price_source=WebsiteVariant.Source.WEBSITE,
                availability_source=WebsiteVariant.Source.COMMERCE,
                commerce_product=product,
                is_published=False,
            )
            created_variants += 1

    return {
        "requested_product_ids": [str(product_id) for product_id in product_ids],
        "imported_product_ids": [str(product.id) for product in products],
        "created_listings": created_listings,
        "created_variants": created_variants,
        "existing_variants": linked_existing_variants,
    }


@transaction.atomic
def disconnect_commerce_variant(
    *, actor, business_id, site_id, listing_id, variant_id
):
    variant = get_variant_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        variant_id=variant_id,
        manage=True,
    )
    if variant.commerce_product_id is None:
        raise ValidationError(
            {"variant_id": "This Website variant is not connected to Commerce."},
            code="website_variant_not_connected",
        )
    current_availability = variant.resolved_availability()
    variant.website_availability = current_availability
    variant.availability_source = WebsiteVariant.Source.WEBSITE
    variant.commerce_product = None
    variant.price_source = WebsiteVariant.Source.WEBSITE
    variant.full_clean()
    variant.save(
        update_fields=[
            "website_availability",
            "availability_source",
            "commerce_product",
            "price_source",
            "updated_at",
        ]
    )
    return variant
