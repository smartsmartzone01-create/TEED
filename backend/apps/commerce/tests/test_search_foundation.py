from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.search.selectors import workspace_search
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product, ProductFamily
from ..inventory.models import StockBatch, StockReceipt


class WorkspaceSearchFoundationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="workspace-search@example.com",
            password="Strong-Password-123!",
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Workspace Search",
            public_handle="workspace-search",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.owner,
            role="owner",
        )
        self.family = ProductFamily.objects.create(
            business=self.business,
            name="iPhone 17 Pro Max",
            brand="Apple",
        )
        self.product = Product.objects.create(
            business=self.business,
            family=self.family,
            name="iPhone 17 Pro Max Cosmic Orange",
            sku="ITM-000017",
            barcode="BAR-IPHONE-17",
            brand="Apple",
            variant="Cosmic Orange",
            unit="item",
            current_quantity=Decimal("3"),
            selling_price=Decimal("4500000"),
        )
        self.receipt = StockReceipt.objects.create(
            business=self.business,
            reference="MZIGO-000003",
            name="September phones",
            sequence=3,
            status=StockReceipt.Status.RECEIVED,
            supplier_name="Dar Phone Supply",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        StockBatch.objects.create(
            receipt=self.receipt,
            product=self.product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            reference="LINE-0001",
            quantity_received=Decimal("3"),
            quantity_remaining=Decimal("3"),
            unit_cost=Decimal("3000000"),
            received_unit="item",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )

    def test_available_products_match_name_sku_barcode_family_brand_and_variant(self):
        for query in [
            "Cosmic Orange",
            "ITM-000017",
            "BAR-IPHONE-17",
            "iPhone 17 Pro Max",
            "Apple",
        ]:
            with self.subTest(query=query):
                data = workspace_search(
                    business=self.business,
                    query=query,
                    scope="available_products",
                )
                self.assertEqual(len(data["sections"]), 1)
                self.assertEqual(data["sections"][0]["key"], "available_products")
                self.assertEqual(
                    data["sections"][0]["results"][0]["id"],
                    str(self.product.id),
                )

    def test_available_products_exclude_sold_out_products(self):
        self.product.current_quantity = Decimal("0")
        self.product.save(update_fields=["current_quantity", "updated_at"])
        data = workspace_search(
            business=self.business,
            query="iPhone",
            scope="available_products",
        )
        self.assertEqual(data["sections"][0]["results"], [])

    def test_stock_matches_receipt_supplier_and_contained_product_family(self):
        for query in ["MZIGO-000003", "September phones", "Dar Phone", "iPhone 17 Pro Max"]:
            with self.subTest(query=query):
                data = workspace_search(
                    business=self.business,
                    query=query,
                    scope="stock",
                )
                result = data["sections"][0]["results"][0]
                self.assertEqual(result["id"], str(self.receipt.id))
                self.assertEqual(result["module"], "commerce.inventory")
                self.assertNotIn("unit_cost", result["metadata"])

    def test_global_search_composes_sections_and_keeps_workspace_isolation(self):
        other = Business.objects.create(
            name="Other Workspace",
            public_handle="other-workspace-search",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        Product.objects.create(
            business=other,
            name="iPhone hidden elsewhere",
            sku="OTHER-001",
            unit="item",
            current_quantity=Decimal("9"),
        )

        data = workspace_search(business=self.business, query="iPhone")

        self.assertEqual(
            [section["key"] for section in data["sections"]],
            ["available_products", "stock"],
        )
        product_ids = {
            result["id"]
            for section in data["sections"]
            for result in section["results"]
            if result["type"] == "available_product"
        }
        self.assertEqual(product_ids, {str(self.product.id)})
