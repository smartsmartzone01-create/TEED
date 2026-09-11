from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.commerce.catalog.models import Product
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant


class PublicWebsiteCatalogTests(APITestCase):
    def setUp(self):
        self.owner = create_user("public-website-catalog@example.com")
        self.business = create_business(user=self.owner, name="Public Website Catalog")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="public-catalog",
            display_name="Public catalog",
            is_published=True,
        )

    def products_url(self):
        return reverse(
            "website-public:products",
            kwargs={"site_key": self.site.public_key},
        )

    def detail_url(self, slug):
        return reverse(
            "website-public:product-detail",
            kwargs={"site_key": self.site.public_key, "slug": slug},
        )

    def test_public_catalog_resolves_managed_listing_and_variant_media(self):
        listing_media = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/listing-managed.webp",
            original_name="listing.webp",
        )
        variant_media = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/variant-managed.webp",
            original_name="variant.webp",
        )
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="website-only-phone",
            title={"en": "Website phone", "sw": "Simu ya tovuti"},
            primary_image_url="https://legacy.example.com/listing.jpg",
            primary_media=listing_media,
            is_published=True,
        )
        variant = WebsiteVariant.objects.create(
            listing=listing,
            sku="WEB-256",
            options={"storage": "256 GB"},
            website_price="1250000.00",
            website_availability=WebsiteVariant.Availability.LOW_STOCK,
            image_url="https://legacy.example.com/variant.jpg",
            media=variant_media,
            is_published=True,
        )

        response = self.client.get(self.products_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product = response.data["data"]["products"][0]
        self.assertEqual(product["primaryImageUrl"], listing_media.public_url)
        self.assertEqual(len(product["skus"]), 1)
        sku = product["skus"][0]
        self.assertEqual(sku["websiteVariantId"], str(variant.id))
        self.assertEqual(sku["imageUrl"], variant_media.public_url)
        self.assertEqual(sku["price"]["amount"], "1250000.00")
        self.assertEqual(sku["availability"], WebsiteVariant.Availability.LOW_STOCK)
        self.assertNotIn("commerceProductId", sku)

    def test_connected_variant_uses_commerce_availability_but_website_price(self):
        product = Product.objects.create(
            business=self.business,
            name="Connected phone",
            sku="COM-128",
            selling_price="999999.00",
            current_quantity="0",
        )
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="connected-phone",
            title={"en": "Connected phone"},
            is_published=True,
        )
        variant = WebsiteVariant.objects.create(
            listing=listing,
            sku=product.sku,
            commerce_product=product,
            availability_source=WebsiteVariant.Source.COMMERCE,
            price_source=WebsiteVariant.Source.WEBSITE,
            website_price="875000.00",
            is_published=True,
        )

        response = self.client.get(self.detail_url(listing.slug))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sku = response.data["data"]["skus"][0]
        self.assertEqual(sku["websiteVariantId"], str(variant.id))
        self.assertEqual(sku["commerceProductId"], str(product.id))
        self.assertEqual(sku["price"]["amount"], "875000.00")
        self.assertNotEqual(sku["price"]["amount"], "999999.00")
        self.assertEqual(sku["availability"], WebsiteVariant.Availability.OUT_OF_STOCK)

    def test_public_catalog_hides_unpublished_listings_and_variants(self):
        WebsiteListing.objects.create(
            site=self.site,
            slug="hidden-listing",
            title={"en": "Hidden listing"},
            is_published=False,
        )
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="visible-listing",
            title={"en": "Visible listing"},
            is_published=True,
        )
        visible_variant = WebsiteVariant.objects.create(
            listing=listing,
            sku="VISIBLE",
            website_price="1000.00",
            is_published=True,
        )
        WebsiteVariant.objects.create(
            listing=listing,
            sku="HIDDEN",
            website_price="2000.00",
            is_published=False,
        )

        response = self.client.get(self.products_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        products = response.data["data"]["products"]
        self.assertEqual([item["slug"] for item in products], [listing.slug])
        self.assertEqual(len(products[0]["skus"]), 1)
        self.assertEqual(products[0]["skus"][0]["websiteVariantId"], str(visible_variant.id))
        hidden_detail = self.client.get(self.detail_url("hidden-listing"))
        self.assertEqual(hidden_detail.status_code, status.HTTP_404_NOT_FOUND)
