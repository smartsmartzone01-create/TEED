from django.core.management.base import BaseCommand, CommandError

from apps.website.catalog_sync import sync_site_catalog
from apps.website.models import WebsiteSite


class Command(BaseCommand):
    help = "Import active Commerce products into a Website site catalog."

    def add_arguments(self, parser):
        parser.add_argument("--site-key", required=True)
        parser.add_argument(
            "--publish-new",
            action="store_true",
            help="Publish newly-created listings and variants immediately.",
        )

    def handle(self, *args, **options):
        site = WebsiteSite.objects.filter(public_key=options["site_key"]).first()
        if site is None:
            raise CommandError("Website site not found for the supplied public key.")

        result = sync_site_catalog(site=site, publish_new=options["publish_new"])
        self.stdout.write(
            self.style.SUCCESS(
                "Website catalog sync complete: "
                f"{result['products']} Commerce products, "
                f"{result['created_listings']} listings created, "
                f"{result['created_variants']} variants created, "
                f"{result['existing_variants']} existing variants preserved."
            )
        )
