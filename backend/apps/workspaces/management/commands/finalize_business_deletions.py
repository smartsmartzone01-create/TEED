from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.workspaces.models import Business, BusinessMembership


class Command(BaseCommand):
    help = "Soft-delete Businesses whose 30-day recovery window has expired."

    def handle(self, *args, **options):
        finalized = 0
        business_ids = Business.objects.filter(
            status=Business.Status.DELETION_PENDING,
            deletion_scheduled_for__lte=timezone.now(),
        ).values_list("id", flat=True)
        for business_id in business_ids.iterator():
            with transaction.atomic():
                business = Business.objects.select_for_update().get(id=business_id)
                if (
                    business.status != Business.Status.DELETION_PENDING
                    or not business.deletion_scheduled_for
                    or business.deletion_scheduled_for > timezone.now()
                ):
                    continue
                BusinessMembership.objects.filter(business=business).update(
                    status=BusinessMembership.Status.REMOVED,
                    updated_at=timezone.now(),
                )
                business.deleted_at = timezone.now()
                business.save(update_fields=["deleted_at", "updated_at"])
                finalized += 1
        self.stdout.write(
            self.style.SUCCESS(f"Finalized {finalized} Business deletion(s).")
        )
