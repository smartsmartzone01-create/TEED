import json

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import APIException

from apps.intelligence.branding import KUZA_AI_NAME
from apps.intelligence.exceptions import IntelligenceError
from apps.intelligence.services import run_kuza_ai


class Command(BaseCommand):
    help = "Run a live Kuza AI smoke test through the configured provider and tools."

    def add_arguments(self, parser):
        parser.add_argument("--user-id", required=True)
        parser.add_argument("--business-id", required=True)
        parser.add_argument(
            "--message",
            default="How is my business doing today?",
        )
        parser.add_argument("--locale", choices=("en", "sw"), default=None)

    def handle(self, *args, **options):
        user = get_user_model()._default_manager.filter(
            pk=options["user_id"]
        ).first()
        if user is None:
            raise CommandError("User not found.")

        try:
            result = run_kuza_ai(
                user=user,
                business_id=options["business_id"],
                message=options["message"],
                requested_locale=options["locale"],
            )
        except (APIException, IntelligenceError, ValidationError) as exc:
            raise CommandError(f"{KUZA_AI_NAME} smoke test failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(KUZA_AI_NAME))
        self.stdout.write(result.reply)
        self.stdout.write(f"Locale: {result.locale}")
        self.stdout.write(f"Usage: {json.dumps(result.usage, sort_keys=True)}")
