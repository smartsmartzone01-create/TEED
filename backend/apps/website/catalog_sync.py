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


def _listing_for_products(*, site, products):
    product_ids = [product.id for product in products]
    return (
        WebsiteListing.objects.filter(
            site=site,
            variants__commerce_product_id__in=product_ids,
        )
        .distinct()
        .order_by("created_at", "id")
        .first()
    )


@transaction.atomic
def sync_site_catalog(*, site: WebsiteSite, publish_new=False):
    """Import active Commerce SKUs into Website without importing operational prices.

    Commerce owns SKU identity, family membership and live availability. Website owns
    public presentation, including the retail price and images. Existing Website copy,
    prices, images and publication choices are preserved.
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

    for group_products in grouped.values():
        first = group_products[0]
        family = first.family
        display_name = family.name if family is not None else first.name
        brand = (family.brand if family is not None else first.brand) or ""

        listing = _listing_for_products(site=site, products=group_products)
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

        for product in group_products:
            existing = (
                WebsiteVariant.objects.filter(
                    listing__site=site,
                    commerce_product=product,
                )
                .select_related("listing")
                .first()
            )
            if existing is not None:
                linked_existing_variants += 1
                continue

            WebsiteVariant.objects.create(
                listing=listing,
                sku=product.sku,
                options={"variant": product.variant} if product.variant else {},
                website_price=None,
                price_source=WebsiteVariant.Source.WEBSITE,
                availability_source=WebsiteVariant.Source.COMMERCE,
                commerce_product=product,
                is_published=publish_new,
            )
            created_variants += 1

    return {
        "products": len(products),
        "created_listings": created_listings,
        "created_variants": created_variants,
        "existing_variants": linked_existing_variants,
    }
