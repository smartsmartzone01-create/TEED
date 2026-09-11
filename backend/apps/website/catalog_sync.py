from collections import defaultdict

from django.db import transaction
from django.utils.text import slugify

from apps.commerce.catalog.models import Product
from apps.commerce.catalog.variant_options import (
    normalize_variant_options,
    variant_option_values,
)

from .models import WebsiteListing, WebsiteSite, WebsiteVariant

COMMON_OPTION_LABELS = {
    "color": {"en": "Color", "sw": "Rangi"},
    "storage": {"en": "Storage", "sw": "Hifadhi"},
    "capacity": {"en": "Capacity", "sw": "Uwezo"},
    "size": {"en": "Size", "sw": "Ukubwa"},
    "ram": {"en": "RAM", "sw": "RAM"},
    "screen_size": {"en": "Screen size", "sw": "Ukubwa wa skrini"},
    "pack_size": {"en": "Pack size", "sw": "Ukubwa wa kifurushi"},
    "material": {"en": "Material", "sw": "Nyenzo"},
    "style": {"en": "Style", "sw": "Mtindo"},
    "model": {"en": "Model", "sw": "Modeli"},
    "weight": {"en": "Weight", "sw": "Uzito"},
    "length": {"en": "Length", "sw": "Urefu"},
    "volume": {"en": "Volume", "sw": "Ujazo"},
    "voltage": {"en": "Voltage", "sw": "Volti"},
    "flavor": {"en": "Flavor", "sw": "Ladha"},
}


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


def _legacy_family_options(products):
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


def _structured_family_options(products):
    """Build storefront axes only when every SKU shares one complete option schema."""

    configurations = [
        normalize_variant_options(product.variant_options) for product in products
    ]
    if not configurations or any(not configuration for configuration in configurations):
        return None

    ordered_keys = [option["key"] for option in configurations[0]]
    expected_keys = set(ordered_keys)
    if any(
        len(configuration) != len(ordered_keys)
        or {option["key"] for option in configuration} != expected_keys
        for configuration in configurations[1:]
    ):
        return None

    options = []
    for key in ordered_keys:
        first = next(option for option in configurations[0] if option["key"] == key)
        labels = COMMON_OPTION_LABELS.get(key) or _localized_name(first["label"])
        values = []
        seen = set()
        for configuration in configurations:
            item = next(option for option in configuration if option["key"] == key)
            folded = item["value"].casefold()
            if folded in seen:
                continue
            seen.add(folded)
            values.append(
                {
                    "value": item["value"],
                    "label": _localized_name(item["value"]),
                }
            )
        options.append({"id": key, "name": labels, "values": values})
    return options


def _replace_managed_listing_options(current, managed_ids, incoming):
    existing = current if isinstance(current, list) else []
    preserved = [
        option
        for option in existing
        if isinstance(option, dict) and str(option.get("id") or "") not in managed_ids
    ]
    return [*preserved, *incoming]


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
    availability. Website owns public presentation and retail prices. Structured
    Product.variant_options become storefront selection axes only when every SKU in a
    family has the same complete option schema; mixed legacy families retain the
    existing variant behavior until their catalog identities are deliberately upgraded.
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
        structured_options = _structured_family_options(group_products)
        structured_mode = structured_options is not None
        family_options = (
            structured_options
            if structured_mode
            else _legacy_family_options(group_products)
        )
        managed_option_ids = {
            "variant",
            *(option["id"] for option in (structured_options or [])),
        }

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
                options=family_options,
                is_published=publish_new,
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
            if structured_mode:
                product_options = variant_option_values(product.variant_options)
            else:
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

                if structured_mode:
                    current_options = (
                        existing.options if isinstance(existing.options, dict) else {}
                    )
                    preserved = {
                        key: value
                        for key, value in current_options.items()
                        if key not in managed_option_ids
                    }
                    next_options = {**preserved, **product_options}
                    if next_options != current_options:
                        existing.options = next_options
                        changed.append("options")
                elif (
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
