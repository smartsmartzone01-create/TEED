from collections import defaultdict

from django.db import transaction
from django.utils.text import slugify

from apps.commerce.catalog.models import Product

from .models import WebsiteListing, WebsiteSite, WebsiteVariant


def _localized_name(value):
    cleaned = str(value or "").strip()
    return {"en": cleaned, "sw": cleaned}


def _unique_listing_slug(site, value):
    base = slugify(str(value or "").strip())[:110] or "product"
    candidate = base
    suffix = 2
    while WebsiteListing.objects.filter(site=site, slug=candidate).exists():
        tail = f"-{suffix}"
        candidate = f"{base[: 120 - len(tail)]}{tail}"
        suffix += 1
    return candidate


def _family_options(products):
    values = []
    seen = set()
    for product in products:
        if product.tracking_mode == Product.TrackingMode.INDIVIDUAL:
            continue
        value = str(product.variant or "").strip()
        if not value or value in seen:
            continue
        seen.add(value)
        values.append({"value": value, "label": _localized_name(value)})
    if len(values) < 2:
        return []
    return [
        {
            "id": "variant",
            "name": {"en": "Variant", "sw": "Aina"},
            "values": values,
        }
    ]


def _listing_title(listing):
    title = listing.title if isinstance(listing.title, dict) else {}
    return str(title.get("en") or title.get("sw") or "").strip()


def _linked_listings(*, site, products):
    product_ids = [product.id for product in products]
    return list(
        WebsiteListing.objects.filter(
            site=site,
            variants__commerce_product_id__in=product_ids,
        )
        .distinct()
        .order_by("created_at", "id")
    )


def _canonical_listing(*, site, products, display_name):
    linked = _linked_listings(site=site, products=products)
    matching = next(
        (
            listing
            for listing in linked
            if _listing_title(listing).casefold() == display_name.casefold()
        ),
        None,
    )
    if matching is not None:
        return matching, linked
    if len(products) == 1 and linked:
        return linked[0], linked
    return None, linked


@transaction.atomic
def sync_site_catalog(*, site: WebsiteSite, publish_new=False):
    """Normalize active Commerce SKUs into Website family listings.

    Product.family_id is the grouping truth. Commerce owns SKU identity and live
    availability. Website owns public presentation, including retail prices and images.
    Existing Website copy, prices and images are preserved when a variant is re-homed
    into its canonical family listing.

    Individually tracked Commerce SKUs may use Product.variant internally as their
    automatic SKU-configuration key. The storefront does not expose that internal
    string; customer-facing color/capacity options continue to come from Commerce's
    safe tracked-unit projection.
    """

    products = list(
        Product.objects.filter(business=site.business, is_active=True)
        .select_related("family")
        .order_by("family__name", "name", "variant", "sku", "id")
    )

    grouped = defaultdict(list)
    for product in products:
        key = ("family", product.family_id) if product.family_id else ("product", product.id)
        grouped[key].append(product)

    created_listings = 0
    created_variants = 0
    linked_existing_variants = 0
    moved_variants = 0
    unpublished_duplicates = 0

    for group_products in grouped.values():
        first = group_products[0]
        family = first.family
        display_name = family.name if family is not None else first.name
        brand = (family.brand if family is not None else first.brand) or ""

        listing, linked_listings = _canonical_listing(
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
                options=_family_options(group_products),
                is_published=publish_new,
            )
            created_listings += 1
        elif not listing.options:
            options = _family_options(group_products)
            if options:
                listing.options = options
                listing.save(update_fields=["options", "updated_at"])

        duplicate_listing_ids = {
            candidate.id for candidate in linked_listings if candidate.id != listing.id
        }

        for product in group_products:
            existing = (
                WebsiteVariant.objects.filter(
                    listing__site=site,
                    commerce_product=product,
                )
                .select_related("listing")
                .first()
            )
            product_options = (
                {}
                if product.tracking_mode == Product.TrackingMode.INDIVIDUAL
                else ({"variant": product.variant} if product.variant else {})
            )
            if existing is not None:
                linked_existing_variants += 1
                changed = []
                if existing.listing_id != listing.id:
                    duplicate_listing_ids.add(existing.listing_id)
                    existing.listing = listing
                    changed.append("listing")
                    moved_variants += 1

                if (
                    product.tracking_mode == Product.TrackingMode.INDIVIDUAL
                    and existing.options == {"variant": product.variant}
                ):
                    existing.options = {}
                    changed.append("options")
                elif (
                    product.tracking_mode != Product.TrackingMode.INDIVIDUAL
                    and product.variant
                    and not existing.options.get("variant")
                ):
                    existing.options = {**existing.options, **product_options}
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
                is_published=publish_new,
            )
            created_variants += 1

        for duplicate in WebsiteListing.objects.filter(
            id__in=duplicate_listing_ids,
            site=site,
            is_published=True,
        ):
            if not duplicate.variants.exists():
                duplicate.is_published = False
                duplicate.save(update_fields=["is_published", "updated_at"])
                unpublished_duplicates += 1

    return {
        "products": len(products),
        "created_listings": created_listings,
        "created_variants": created_variants,
        "existing_variants": linked_existing_variants,
        "moved_variants": moved_variants,
        "unpublished_duplicates": unpublished_duplicates,
    }
