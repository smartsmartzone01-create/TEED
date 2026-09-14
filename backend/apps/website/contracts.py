from .catalog_resolver import resolve_storefront_variant
from .models import WebsiteListing, WebsiteSite

SUPPORTED_LOCALES = ("en", "sw")
NAVIGATION_SECTIONS = {
    "hero": "/#hero",
    "popular": "/#popular",
    "services": "/#services",
    "footer": "/#footer",
}
FEATURED_BACKGROUNDS = ("#eef6ff", "#fff4e8", "#effaf3", "#f6efff")


def localized(value, fallback=""):
    source = value if isinstance(value, dict) else {}
    return {
        locale: str(source.get(locale) or fallback)
        for locale in SUPPORTED_LOCALES
    }


def _clean_optional(payload):
    return {key: value for key, value in payload.items() if value not in (None, "")}


def _safe_external_url(value):
    url = str(value or "").strip()
    if url.startswith(("https://", "http://")):
        return url
    return ""


def _safe_hex_color(value, fallback):
    color = str(value or "").strip()
    if len(color) == 7 and color.startswith("#"):
        try:
            int(color[1:], 16)
            return color.lower()
        except ValueError:
            pass
    return fallback


def _resolve_target_href(target, listing_routes, fallback=""):
    if isinstance(target, dict):
        target_type = target.get("type")
        if target_type == "home":
            return "/"
        if target_type == "shop":
            return "/products"
        if target_type == "product":
            return listing_routes.get(str(target.get("id") or ""), "")
        if target_type == "section":
            return NAVIGATION_SECTIONS.get(str(target.get("section") or ""), "")
        if target_type == "external":
            return _safe_external_url(target.get("url"))

    return str(fallback or "").strip()


def _resolve_navigation_href(item, listing_routes):
    if not isinstance(item, dict):
        return ""
    return _resolve_target_href(
        item.get("target"),
        listing_routes,
        item.get("href"),
    )


def _serialize_navigation_item(
    item,
    index,
    *,
    listing_routes,
    prefix="nav",
    include_children=True,
):
    if not isinstance(item, dict):
        return None
    href = _resolve_navigation_href(item, listing_routes)
    if not href:
        return None

    payload = {
        "id": str(item.get("id") or f"{prefix}-{index + 1}"),
        "label": localized(item.get("label")),
        "href": href,
    }

    if include_children:
        children = []
        raw_children = item.get("children")
        if isinstance(raw_children, list):
            for child_index, child in enumerate(raw_children):
                serialized = _serialize_navigation_item(
                    child,
                    child_index,
                    listing_routes=listing_routes,
                    prefix=f"{payload['id']}-child",
                    include_children=False,
                )
                if serialized is not None:
                    children.append(serialized)
        if children:
            payload["children"] = children

    return payload


def _serialize_featured_item(item, index, listing_routes):
    if not isinstance(item, dict):
        return None

    raw_listing_id = str(item.get("listingId") or "").strip()
    listing_id = raw_listing_id if raw_listing_id in listing_routes else ""
    source = "listing" if item.get("source") == "listing" and listing_id else "standalone"
    action_href = _resolve_target_href(
        item.get("actionTarget"),
        listing_routes,
        listing_routes.get(listing_id, "") if source == "listing" else "",
    )

    payload = {
        "id": str(item.get("id") or f"featured-{index + 1}"),
        "source": source,
        "title": localized(item.get("title")),
        "description": localized(item.get("description")),
        "actionLabel": localized(item.get("actionLabel")),
        "actionHref": action_href,
        "imageSide": "left" if item.get("imageSide") == "left" else "right",
        "backgroundColor": _safe_hex_color(
            item.get("backgroundColor"),
            FEATURED_BACKGROUNDS[index % len(FEATURED_BACKGROUNDS)],
        ),
        "textColor": _safe_hex_color(item.get("textColor"), "#172033"),
    }
    if listing_id:
        payload["listingId"] = listing_id
    image_url = str(item.get("imageUrl") or "").strip()
    if image_url:
        payload["imageUrl"] = image_url
    return payload


def _serialize_category_item(item, index):
    if not isinstance(item, dict):
        return None
    title = localized(item.get("title"))
    if not any(value.strip() for value in title.values()):
        return None

    source = "family" if item.get("source") == "family" else "standalone"
    family_id = str(item.get("familyId") or "").strip()
    raw_href = str(item.get("href") or "").strip()
    href = f"/products?family={family_id}" if source == "family" and family_id else raw_href
    if not href:
        href = "/products"

    payload = {
        "id": str(item.get("id") or f"category-{index + 1}"),
        "source": source,
        "title": title,
        "description": localized(item.get("description")),
        "href": href,
    }
    if family_id:
        payload["familyId"] = family_id
    image_url = str(item.get("imageUrl") or "").strip()
    if image_url:
        payload["imageUrl"] = image_url
    return payload


def serialize_site(site: WebsiteSite):
    header = site.header if isinstance(site.header, dict) else {}
    hero = site.hero if isinstance(site.hero, dict) else {}
    featured_products = (
        site.featured_products if isinstance(site.featured_products, dict) else {}
    )
    categories = site.categories if isinstance(site.categories, dict) else {}
    newsletter = site.newsletter if isinstance(site.newsletter, dict) else {}
    supported_locales = [
        locale
        for locale in site.supported_locales
        if locale in SUPPORTED_LOCALES
    ] if isinstance(site.supported_locales, list) else []
    if site.default_locale not in supported_locales:
        supported_locales.insert(0, site.default_locale)

    listing_routes = {
        str(listing_id): f"/products/{slug}"
        for listing_id, slug in WebsiteListing.objects.filter(site=site).values_list(
            "id", "slug"
        )
    }
    navigation = []
    for index, item in enumerate(site.navigation if isinstance(site.navigation, list) else []):
        serialized = _serialize_navigation_item(
            item,
            index,
            listing_routes=listing_routes,
        )
        if serialized is not None:
            navigation.append(serialized)

    services = []
    for index, item in enumerate(site.services if isinstance(site.services, list) else []):
        if not isinstance(item, dict):
            continue
        service = {
            "id": str(item.get("id") or f"service-{index + 1}"),
            "title": localized(item.get("title")),
            "description": localized(item.get("description")),
        }
        image_url = str(item.get("imageUrl") or "").strip()
        if image_url:
            service["imageUrl"] = image_url
        services.append(service)

    contact = _clean_optional(
        {
            "phone": site.contact_phone,
            "email": site.contact_email,
            "whatsapp": site.contact_whatsapp,
            "instagram": site.contact_instagram,
        }
    )

    header_payload = {}
    logo_image_url = str(header.get("logoImageUrl") or "").strip()
    if logo_image_url:
        header_payload["logoImageUrl"] = logo_image_url

    image_url = str(hero.get("imageUrl") or "").strip()
    requested_layout = str(hero.get("layout") or "").strip()
    layout = requested_layout if requested_layout in ("text", "split") else (
        "split" if image_url else "text"
    )
    primary_href = _resolve_target_href(
        hero.get("primaryTarget"),
        listing_routes,
        hero.get("primaryHref") or "/products",
    ) or "/products"
    hero_payload = {
        "backgroundPreset": "sky-white",
        "layout": layout,
        "title": localized(hero.get("title"), site.display_name),
        "subtitle": localized(hero.get("subtitle")),
        "primaryAction": localized(hero.get("primaryAction"), "Browse"),
        "primaryHref": primary_href,
    }
    eyebrow = hero.get("eyebrow")
    if eyebrow:
        hero_payload["eyebrow"] = localized(eyebrow)
    secondary_action = hero.get("secondaryAction")
    secondary_href = _resolve_target_href(
        hero.get("secondaryTarget"),
        listing_routes,
        hero.get("secondaryHref"),
    )
    if secondary_action and secondary_href:
        hero_payload["secondaryAction"] = localized(secondary_action)
        hero_payload["secondaryHref"] = secondary_href
    if image_url:
        hero_payload["imageUrl"] = image_url
        hero_payload["imageAlt"] = localized(
            hero.get("imageAlt"),
            site.display_name,
        )

    featured_items = []
    raw_items = featured_products.get("items")
    if isinstance(raw_items, list):
        for index, item in enumerate(raw_items[:4]):
            serialized = _serialize_featured_item(item, index, listing_routes)
            if serialized is not None:
                featured_items.append(serialized)

    if not featured_items:
        raw_listing_ids = featured_products.get("listingIds")
        if isinstance(raw_listing_ids, list):
            for value in raw_listing_ids:
                listing_id = str(value or "").strip()
                if listing_id not in listing_routes:
                    continue
                index = len(featured_items)
                featured_items.append(
                    {
                        "id": f"featured-listing-{listing_id}",
                        "source": "listing",
                        "listingId": listing_id,
                        "title": localized({}),
                        "description": localized({}),
                        "actionLabel": localized({"en": "View product", "sw": "Tazama bidhaa"}),
                        "actionHref": listing_routes[listing_id],
                        "imageSide": "left" if index % 2 else "right",
                        "backgroundColor": FEATURED_BACKGROUNDS[index % len(FEATURED_BACKGROUNDS)],
                        "textColor": "#172033",
                    }
                )
                if len(featured_items) == 4:
                    break

    category_items = []
    raw_categories = categories.get("items")
    if isinstance(raw_categories, list):
        for index, item in enumerate(raw_categories[:30]):
            serialized = _serialize_category_item(item, index)
            if serialized is not None:
                category_items.append(serialized)

    return {
        "id": str(site.id),
        "businessId": str(site.business_id),
        "slug": site.slug,
        "displayName": site.display_name,
        "defaultLocale": site.default_locale,
        "supportedLocales": supported_locales,
        "theme": {
            "primaryColor": site.primary_color,
            "surfaceColor": site.surface_color,
            "textColor": site.text_color,
        },
        "contact": contact,
        "header": header_payload,
        "navigation": navigation,
        "hero": hero_payload,
        "featuredProducts": {
            "enabled": bool(featured_products.get("enabled", True)),
            "items": featured_items,
            "rotationMs": 5000,
        },
        "categories": {
            "enabled": bool(categories.get("enabled", True)),
            "title": localized(
                categories.get("title"),
                "Products",
            ),
            "items": category_items,
            "viewAllHref": "/products",
        },
        "services": services,
        "newsletter": {
            "enabled": bool(newsletter.get("enabled", False)),
            "title": localized(newsletter.get("title")),
            "description": localized(newsletter.get("description")),
        },
    }


def _serialize_option(option, index):
    if not isinstance(option, dict):
        return None
    option_id = str(option.get("id") or f"option-{index + 1}")
    values = []
    for value_index, value in enumerate(option.get("values") or []):
        if not isinstance(value, dict):
            continue
        raw_value = str(value.get("value") or "").strip()
        if not raw_value:
            continue
        item = {
            "value": raw_value,
            "label": localized(value.get("label"), raw_value),
        }
        color_hex = str(value.get("colorHex") or "").strip()
        if color_hex:
            item["colorHex"] = color_hex
        values.append(item)
    return {
        "id": option_id,
        "name": localized(option.get("name"), option_id),
        "values": values,
    }


def _merge_option(options, incoming):
    existing = next(
        (option for option in options if option["id"] == incoming["id"]),
        None,
    )
    if existing is None:
        options.append(incoming)
        return

    existing_values = {
        value["value"]
        for value in existing["values"]
    }
    for value in incoming["values"]:
        if value["value"] not in existing_values:
            existing["values"].append(value)
            existing_values.add(value["value"])


def serialize_listing(listing: WebsiteListing):
    options = []
    family_ids = []
    for index, option in enumerate(
        listing.options if isinstance(listing.options, list) else []
    ):
        serialized = _serialize_option(option, index)
        if serialized is not None:
            options.append(serialized)

    variants = []
    for variant in listing.variants.all():
        if not variant.is_published:
            continue
        product = variant.valid_commerce_product()
        if product is not None and product.family_id:
            family_id = str(product.family_id)
            if family_id not in family_ids:
                family_ids.append(family_id)
        derived_options, resolved_variants = resolve_storefront_variant(variant)
        for derived_option in derived_options:
            _merge_option(options, derived_option)
        variants.extend(resolved_variants)

    payload = {
        "id": str(listing.id),
        "slug": listing.slug,
        "title": localized(listing.title),
        "shortDescription": localized(listing.short_description),
        "description": localized(listing.description),
        "primaryImageUrl": listing.resolved_primary_image_url(),
        "familyIds": family_ids,
        "options": options,
        "skus": variants,
    }
    if listing.brand:
        payload["brand"] = listing.brand
    badge = localized(listing.badge)
    if any(badge.values()):
        payload["badge"] = badge
    return payload
