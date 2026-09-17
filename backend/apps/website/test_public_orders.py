from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .catalog_resolver import resolve_storefront_variant
from .models import WebsiteListing, WebsiteSite, WebsiteVariant
from .order_models import WebsiteOrder


class PublicWebsiteOrderTests(APITestCase):
    def setUp(self):
        self.owner = create_user("public-website-orders@example.com")
        self.business = create_business(user=self.owner, name="Public Website Orders")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="orders",
            display_name="Orders",
            is_published=True,
        )
        self.listing = WebsiteListing.objects.create(
            site=self.site,
            slug="order-phone",
            title={"en": "Order phone", "sw": "Simu ya oda"},
            primary_image_url="https://cdn.example.com/order-phone.webp",
            is_published=True,
        )
        self.variant = WebsiteVariant.objects.create(
            listing=self.listing,
            sku="PHONE-256-BLUE",
            options={"storage": "256 GB", "color": "Blue"},
            website_price="1000.00",
            website_availability=WebsiteVariant.Availability.IN_STOCK,
            is_published=True,
        )

    def orders_url(self, site=None):
        target = site or self.site
        return reverse(
            "website-public:orders",
            kwargs={"site_key": target.public_key},
        )

    def offer_for(self, variant=None):
        _options, offers = resolve_storefront_variant(variant or self.variant)
        return offers[0]

    def payload(self, *, variant=None, offer=None, quantity=1):
        target_variant = variant or self.variant
        target_offer = offer or self.offer_for(target_variant)
        return {
            "fullName": "Asha Mteja",
            "phone": "+255712345678",
            "email": "asha@example.com",
            "deliveryAddress": "Mbezi Beach, Dar es Salaam",
            "note": "Please call before delivery.",
            "items": [
                {
                    "websiteVariantId": str(target_variant.id),
                    "offerId": target_offer["id"],
                    "quantity": quantity,
                    "price": {"amount": "1.00", "currency": "TZS"},
                }
            ],
        }

    def test_order_revalidates_current_price_and_snapshots_public_offer(self):
        offer = self.offer_for()
        self.variant.website_price = "1500.00"
        self.variant.save(update_fields=["website_price"])

        response = self.client.post(
            self.orders_url(),
            self.payload(offer=offer, quantity=2),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["total"], "3000.00")
        self.assertTrue(response.data["data"]["orderNumber"].startswith("TKZ-"))
        self.assertEqual(response.data["data"]["status"], "new")

        order = WebsiteOrder.objects.get()
        self.assertEqual(str(order.total), "3000.00")
        item = order.items.get()
        self.assertEqual(str(item.unit_price), "1500.00")
        self.assertEqual(str(item.line_total), "3000.00")
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.sku, self.variant.sku)
        self.assertEqual(item.options, {"storage": "256 GB", "color": "Blue"})
        self.assertEqual(item.title, self.listing.title)
        self.assertEqual(item.variant_id, self.variant.id)

    def test_order_rejects_offer_that_is_now_out_of_stock(self):
        offer = self.offer_for()
        self.variant.website_availability = WebsiteVariant.Availability.OUT_OF_STOCK
        self.variant.save(update_fields=["website_availability"])

        response = self.client.post(
            self.orders_url(),
            self.payload(offer=offer),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(WebsiteOrder.objects.exists())

    def test_order_rejects_variant_from_another_site(self):
        other_site = WebsiteSite.objects.create(
            business=self.business,
            slug="other-orders",
            display_name="Other orders",
            is_published=True,
        )
        other_listing = WebsiteListing.objects.create(
            site=other_site,
            slug="other-phone",
            title={"en": "Other phone"},
            is_published=True,
        )
        other_variant = WebsiteVariant.objects.create(
            listing=other_listing,
            sku="OTHER-PHONE",
            website_price="2000.00",
            is_published=True,
        )
        other_offer = self.offer_for(other_variant)

        response = self.client.post(
            self.orders_url(),
            self.payload(variant=other_variant, offer=other_offer),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(WebsiteOrder.objects.exists())

    def test_order_rejects_unpublished_variant(self):
        offer = self.offer_for()
        self.variant.is_published = False
        self.variant.save(update_fields=["is_published"])

        response = self.client.post(
            self.orders_url(),
            self.payload(offer=offer),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(WebsiteOrder.objects.exists())
