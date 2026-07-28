from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.identity.models import IdentitySecurityEvent


class Command(BaseCommand):
    help = "Permanently delete identity security events past their retention date."

    def handle(self, *args, **options):
        deleted, _ = IdentitySecurityEvent.all_objects.filter(
            expires_at__lte=timezone.now()
        ).delete()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {deleted} expired security event rows.")
        )
