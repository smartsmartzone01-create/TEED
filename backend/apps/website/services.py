from pathlib import Path

from common.database.uuid import generate_uuid
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import NotFound, ValidationError

from apps.workspaces.policy import WorkspacePermission
from apps.workspaces.services import require_membership

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant

IMAGE_FORMAT_METADATA = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
}


def _website_membership(*, user, business_id, manage=False):
    return require_membership(
        user=user,
        business_id=business_id,
        permission=(
            WorkspacePermission.MANAGE_WEBSITE
            if manage
            else WorkspacePermission.ACCESS
        ),
    )


def list_sites_for_user(*, user, business_id):
    membership = _website_membership(user=user, business_id=business_id)
    return WebsiteSite.objects.filter(business=membership.business)


def get_site_for_user(*, user, business_id, site_id, manage=False):
    membership = _website_membership(
        user=user,
        business_id=business_id,
        manage=manage,
    )
    site = WebsiteSite.objects.filter(id=site_id, business=membership.business).first()
    if site is None:
        raise NotFound("Website site not found.", code="website_site_not_found")
    return site


def _site_slug_exists(*, business, slug, exclude_site_id=None):
    query = WebsiteSite.objects.filter(business=business, slug=slug)
    if exclude_site_id is not None:
        query = query.exclude(id=exclude_site_id)
    return query.exists()


@transaction.atomic
def create_site(*, actor, business_id, **values):
    membership = _website_membership(user=actor, business_id=business_id, manage=True)
    business = membership.business
    display_name = str(values.pop("display_name", "") or business.name).strip()
    slug = str(values.pop("slug", "") or slugify(display_name) or "website").strip()
    if _site_slug_exists(business=business, slug=slug):
        raise ValidationError(
            {"slug": "A Website site with this slug already exists."},
            code="website_site_slug_conflict",
        )

    site = WebsiteSite(
        business=business,
        display_name=display_name,
        slug=slug,
        **values,
    )
    site.full_clean()
    site.save()
    return site


@transaction.atomic
def update_site(*, actor, business_id, site_id, **changes):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    requested_slug = changes.get("slug")
    if requested_slug and requested_slug != site.slug and _site_slug_exists(
        business=site.business,
        slug=requested_slug,
        exclude_site_id=site.id,
    ):
        raise ValidationError(
            {"slug": "A Website site with this slug already exists."},
            code="website_site_slug_conflict",
        )

    for field, value in changes.items():
        setattr(site, field, value)
    site.full_clean()
    site.save()
    return site


def _managed_media_prefix(site):
    return f"websites/{site.id}/media/"


def _absolute_storage_url(*, request, storage_key):
    storage_url = default_storage.url(storage_key)
    if storage_url.startswith(("https://", "http://")):
        return storage_url
    return request.build_absolute_uri(storage_url)


@transaction.atomic
def register_media(*, actor, business_id, site_id, **values):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    media = WebsiteMedia(site=site, **values)
    media.full_clean()
    media.save()
    return media


@transaction.atomic
def upload_media(
    *, actor, business_id, site_id, request, file, alt_text, **values
):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    image_format = file.website_image_format
    extension, mime_type = IMAGE_FORMAT_METADATA[image_format]
    original_name = Path(file.name).name[:255]
    requested_key = f"{_managed_media_prefix(site)}{generate_uuid()}.{extension}"
    storage_key = default_storage.save(requested_key, file)

    try:
        media = WebsiteMedia(
            site=site,
            kind=WebsiteMedia.Kind.IMAGE,
            public_url=_absolute_storage_url(request=request, storage_key=storage_key),
            storage_key=storage_key,
            original_name=original_name,
            mime_type=mime_type,
            alt_text=alt_text,
            width=file.website_image_width,
            height=file.website_image_height,
            size_bytes=file.size,
            **values,
        )
        media.full_clean(exclude={"public_url"})
        media.save()
    except Exception:
        default_storage.delete(storage_key)
        raise
    return media


@transaction.atomic
def update_media(*, actor, business_id, site_id, media_id, **changes):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    media = WebsiteMedia.objects.filter(id=media_id, site=site).first()
    if media is None:
        raise NotFound("Website media not found.", code="website_media_not_found")

    for field, value in changes.items():
        setattr(media, field, value)
    media.full_clean()
    media.save()
    return media


@transaction.atomic
def delete_media(*, actor, business_id, site_id, media_id):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    media = WebsiteMedia.objects.filter(id=media_id, site=site).first()
    if media is None:
        raise NotFound("Website media not found.", code="website_media_not_found")

    storage_key = media.storage_key
    managed_storage = bool(
        storage_key and storage_key.startswith(_managed_media_prefix(site))
    )
    WebsiteListing.objects.filter(site=site, primary_media=media).update(
        primary_media=None
    )
    WebsiteVariant.objects.filter(listing__site=site, media=media).update(media=None)
    media.delete()
    if managed_storage:
        transaction.on_commit(lambda: default_storage.delete(storage_key))
    return media


@transaction.atomic
def reorder_media(*, actor, business_id, site_id, media_ids):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    current = list(WebsiteMedia.objects.filter(site=site))
    current_ids = {item.id for item in current}
    requested_ids = set(media_ids)
    if current_ids != requested_ids:
        raise ValidationError(
            {"media_ids": "Provide every active media id for this Website site."},
            code="website_media_reorder_mismatch",
        )

    by_id = {item.id: item for item in current}
    for index, media_id in enumerate(media_ids):
        media = by_id[media_id]
        if media.sort_order != index:
            media.sort_order = index
            media.save(update_fields=["sort_order", "updated_at"])
    return list(WebsiteMedia.objects.filter(site=site))


def _media_for_site(*, site, media_id):
    if media_id is None:
        return None
    media = WebsiteMedia.objects.filter(id=media_id, site=site).first()
    if media is None:
        raise ValidationError(
            {"media_id": "Media must belong to this Website site."},
            code="website_media_site_mismatch",
        )
    return media


def list_listings_for_user(*, user, business_id, site_id):
    site = get_site_for_user(user=user, business_id=business_id, site_id=site_id)
    return (
        WebsiteListing.objects.filter(site=site)
        .select_related("primary_media")
        .prefetch_related("variants__media")
    )


def get_listing_for_user(*, user, business_id, site_id, listing_id, manage=False):
    site = get_site_for_user(
        user=user,
        business_id=business_id,
        site_id=site_id,
        manage=manage,
    )
    listing = (
        WebsiteListing.objects.filter(id=listing_id, site=site)
        .select_related("primary_media")
        .prefetch_related("variants__media")
        .first()
    )
    if listing is None:
        raise NotFound("Website listing not found.", code="website_listing_not_found")
    return listing


def _listing_slug_conflicts(*, site, slug, exclude_listing_id=None):
    query = WebsiteListing.all_objects.filter(site=site, slug=slug)
    if exclude_listing_id is not None:
        query = query.exclude(id=exclude_listing_id)
    return query.exists()


@transaction.atomic
def create_listing(*, actor, business_id, site_id, **values):
    site = get_site_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        manage=True,
    )
    slug = values["slug"]
    if _listing_slug_conflicts(site=site, slug=slug):
        raise ValidationError(
            {"slug": "A Website listing with this slug already exists."},
            code="website_listing_slug_conflict",
        )
    media_id = values.pop("primary_media_id", None)
    listing = WebsiteListing(
        site=site,
        primary_media=_media_for_site(site=site, media_id=media_id),
        **values,
    )
    listing.full_clean()
    listing.save()
    return listing


@transaction.atomic
def update_listing(*, actor, business_id, site_id, listing_id, **changes):
    listing = get_listing_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        manage=True,
    )
    requested_slug = changes.get("slug")
    if requested_slug and requested_slug != listing.slug and _listing_slug_conflicts(
        site=listing.site,
        slug=requested_slug,
        exclude_listing_id=listing.id,
    ):
        raise ValidationError(
            {"slug": "A Website listing with this slug already exists."},
            code="website_listing_slug_conflict",
        )
    if "primary_media_id" in changes:
        media_id = changes.pop("primary_media_id")
        listing.primary_media = _media_for_site(site=listing.site, media_id=media_id)
    for field, value in changes.items():
        setattr(listing, field, value)
    listing.full_clean()
    listing.save()
    return listing


@transaction.atomic
def delete_listing(*, actor, business_id, site_id, listing_id):
    listing = get_listing_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        manage=True,
    )
    for variant in WebsiteVariant.objects.filter(listing=listing):
        variant.delete()
    listing.delete()
    return listing


def list_variants_for_user(*, user, business_id, site_id, listing_id):
    listing = get_listing_for_user(
        user=user,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
    )
    return WebsiteVariant.objects.filter(listing=listing).select_related("media")


def get_variant_for_user(
    *, user, business_id, site_id, listing_id, variant_id, manage=False
):
    listing = get_listing_for_user(
        user=user,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        manage=manage,
    )
    variant = WebsiteVariant.objects.filter(id=variant_id, listing=listing).first()
    if variant is None:
        raise NotFound("Website variant not found.", code="website_variant_not_found")
    return variant


def _variant_sku_conflicts(*, listing, sku, exclude_variant_id=None):
    if not sku:
        return False
    query = WebsiteVariant.all_objects.filter(listing=listing, sku=sku)
    if exclude_variant_id is not None:
        query = query.exclude(id=exclude_variant_id)
    return query.exists()


@transaction.atomic
def create_variant(*, actor, business_id, site_id, listing_id, **values):
    listing = get_listing_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        manage=True,
    )
    sku = values.get("sku", "")
    if _variant_sku_conflicts(listing=listing, sku=sku):
        raise ValidationError(
            {"sku": "A Website variant with this SKU already exists."},
            code="website_variant_sku_conflict",
        )
    media_id = values.pop("media_id", None)
    variant = WebsiteVariant(
        listing=listing,
        media=_media_for_site(site=listing.site, media_id=media_id),
        commerce_product=None,
        price_source=WebsiteVariant.Source.WEBSITE,
        availability_source=WebsiteVariant.Source.WEBSITE,
        **values,
    )
    variant.full_clean()
    variant.save()
    return variant


@transaction.atomic
def update_variant(
    *, actor, business_id, site_id, listing_id, variant_id, **changes
):
    variant = get_variant_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        variant_id=variant_id,
        manage=True,
    )
    requested_sku = changes.get("sku")
    if requested_sku is not None and requested_sku != variant.sku and _variant_sku_conflicts(
        listing=variant.listing,
        sku=requested_sku,
        exclude_variant_id=variant.id,
    ):
        raise ValidationError(
            {"sku": "A Website variant with this SKU already exists."},
            code="website_variant_sku_conflict",
        )
    if "media_id" in changes:
        media_id = changes.pop("media_id")
        variant.media = _media_for_site(site=variant.listing.site, media_id=media_id)
    for field, value in changes.items():
        setattr(variant, field, value)
    variant.full_clean()
    variant.save()
    return variant


@transaction.atomic
def delete_variant(*, actor, business_id, site_id, listing_id, variant_id):
    variant = get_variant_for_user(
        user=actor,
        business_id=business_id,
        site_id=site_id,
        listing_id=listing_id,
        variant_id=variant_id,
        manage=True,
    )
    variant.delete()
    return variant
