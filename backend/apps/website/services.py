from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.workspaces.policy import WorkspacePermission
from apps.workspaces.services import require_membership

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant


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

    WebsiteListing.objects.filter(site=site, primary_media=media).update(primary_media=None)
    WebsiteVariant.objects.filter(listing__site=site, media=media).update(media=None)
    media.delete()
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
