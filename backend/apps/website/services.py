from pathlib import Path

from common.database.uuid import generate_uuid
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.workspaces.policy import WorkspacePermission
from apps.workspaces.services import require_membership

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant

IMAGE_FORMAT_METADATA = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
}


def get_site_for_user(*, user, business_id, site_id, manage=False):
    membership = require_membership(
        user=user,
        business_id=business_id,
        permission=(
            WorkspacePermission.MANAGE_WEBSITE
            if manage
            else WorkspacePermission.ACCESS
        ),
    )
    site = WebsiteSite.objects.filter(id=site_id, business=membership.business).first()
    if site is None:
        raise NotFound("Website site not found.", code="website_site_not_found")
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
def upload_media(*, actor, business_id, site_id, request, file, alt_text, **values):
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
        media.full_clean()
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
