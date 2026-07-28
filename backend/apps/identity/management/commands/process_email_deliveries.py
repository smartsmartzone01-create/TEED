from django.core.management.base import BaseCommand, CommandError

from apps.identity.services import process_email_deliveries


class Command(BaseCommand):
    help = "Process due email-delivery outbox jobs."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **options):
        limit = options["limit"]
        if limit < 1 or limit > 1000:
            raise CommandError("--limit must be between 1 and 1000.")
        processed = process_email_deliveries(limit=limit)
        self.stdout.write(
            self.style.SUCCESS(f"Processed {processed} email delivery job(s).")
        )
