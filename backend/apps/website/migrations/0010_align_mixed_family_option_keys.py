from django.db import migrations


def _clean_options(value):
    if not isinstance(value, dict):
        return {}
    return {
        str(key).strip(): str(option_value).strip()
        for key, option_value in value.items()
        if str(key).strip() and str(option_value).strip()
    }


def align_mixed_family_option_keys(apps, schema_editor):
    WebsiteListing = apps.get_model("website", "WebsiteListing")
    WebsiteVariant = apps.get_model("website", "WebsiteVariant")

    listings = WebsiteListing.objects.filter(is_deleted=False).iterator()
    for listing in listings:
        variants = list(
            WebsiteVariant.objects.filter(
                listing_id=listing.id,
                is_deleted=False,
            ).order_by("sort_order", "created_at", "id")
        )
        commerce_variants = [
            variant
            for variant in variants
            if variant.commerce_product_id is not None and variant.commerce_connected
        ]
        website_variants = [
            variant
            for variant in variants
            if variant.commerce_product_id is None
        ]
        if not commerce_variants or not website_variants:
            continue

        commerce_schemas = []
        incomplete_commerce_schema = False
        for variant in commerce_variants:
            options = _clean_options(variant.options)
            if not options:
                incomplete_commerce_schema = True
                break
            commerce_schemas.append(list(options.keys()))
        if incomplete_commerce_schema or not commerce_schemas:
            continue

        canonical_order = commerce_schemas[0]
        canonical_keys = set(canonical_order)
        if any(set(schema) != canonical_keys for schema in commerce_schemas[1:]):
            continue

        removed_keys = set()
        changed = False
        for variant in website_variants:
            options = _clean_options(variant.options)
            if not options or len(options) != len(canonical_order):
                continue

            current_keys = set(options)
            extra_keys = [key for key in options if key not in canonical_keys]
            missing_keys = [key for key in canonical_order if key not in current_keys]
            if len(extra_keys) != 1 or len(missing_keys) != 1:
                continue
            if len(canonical_keys) > 1 and not (current_keys & canonical_keys):
                continue

            old_key = extra_keys[0]
            new_key = missing_keys[0]
            next_options = {
                (new_key if key == old_key else key): value
                for key, value in options.items()
            }
            variant.options = next_options
            variant.save(update_fields=["options"])
            removed_keys.add(old_key)
            changed = True

        if not changed or not removed_keys:
            continue

        remaining_keys = set()
        for variant in variants:
            remaining_keys.update(_clean_options(variant.options))

        raw_listing_options = listing.options if isinstance(listing.options, list) else []
        next_listing_options = []
        for raw_option in raw_listing_options:
            if not isinstance(raw_option, dict):
                next_listing_options.append(raw_option)
                continue
            option_id = str(raw_option.get("id") or "").strip()
            if option_id in removed_keys and option_id not in remaining_keys:
                continue
            next_listing_options.append(raw_option)

        if next_listing_options != raw_listing_options:
            listing.options = next_listing_options
            listing.save(update_fields=["options"])


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0009_websitelisting_filter_metrics"),
    ]

    operations = [
        migrations.RunPython(
            align_mixed_family_option_keys,
            migrations.RunPython.noop,
        ),
    ]
