from .catalog_resolver import resolve_storefront_variant
from .models import WebsiteListing, WebsiteSite

SUPPORTED_LOCALES = ("en", "sw")


def localized(value, fallback=""):
    source = value if isinstance(value, dict) else {}
    return {
        locale: str(source.get(locale) or fallback)
        for locale in SUPPORTED_LOCALES
    }


def _clean_optional(payload):
    return {key: value for key, value in payload.items() if value not in (None, "")}


def serialize_site(site: WebsiteSite):
    hero = site.hero if isinstance(site.hero, dict) else {}
    newsletter = site.newsletter if isinstance(site.newsletter, dict) else {}
    supported_locales = [
        locale
        for locale in site.supported_locales
        if locale in SUPPORTED_LOCALES
    ] if isinstance(site.supported_locales, list) else []
    if site.default_locale not in supported_locales:
        supported_locales.insert(0, site.default_locale)

    navigation = []
    for index, item in enumerate(site.navigation if isinstance(site.navigation, list) else []):
        if not isinstance(item, dict):
            continue
        href = str(item.get("href") or "").strip()
        if not href:
            continue
        navigation.append(
            {
                "id": str(item.get("id") or f"nav-{index + 1}"),
                "label": localized(item.get("label")),
                "href": href,
            }
        )

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

    hero_payload = {
        "title": localized(hero.get("title"), site.display_name),
        "subtitle": localized(hero.get("subtitle")),
        "primaryAction": localized(hero.get("primaryAction"), "Browse"),
        "primaryHref": str(hero.get("primaryHref") or "/products"),
    }
    eyebrow = hero.get("eyebrow")
    if eyebrow:
        hero_payload["eyebrow"] = localized(eyebrow)
    secondary_action = hero.get("secondaryAction")
    secondary_href = str(hero.get("secondaryHref") or "").strip()
    if secondary_action and secondary_href:
        hero_payload["secondaryAction"] = localized(secondary_action)
        hero_payload["secondaryHref"] = secondary_href
    image_url = str(hero.get("imageUrl") or "").strip()
    if image_url:
        hero_payload["imageUrl"] = image_url

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
        "navigation": navigation,
        "hero": hero_payload,
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
        "options": options,
        "skus": variants,
    }
    if listing.brand:
        payload["brand"] = listing.brand
    badge = localized(listing.badge)
    if any(badge.values()):
        payload["badge"] = badge
    return payload
