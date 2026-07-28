from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.identity.models import EmailDelivery


class Command(BaseCommand):
    help = "Delete terminal email-delivery jobs past operational retention."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=settings.EMAIL_DELIVERY_RETENTION_DAYS)
        deleted, _ = EmailDelivery.all_objects.filter(
            status__in=[
                EmailDelivery.Status.SENT,
                EmailDelivery.Status.DEAD,
            ],
            updated_at__lte=cutoff,
        ).delete()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {deleted} email delivery row(s).")
        )
