from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product, ProductFamily
from ..inventory.models import StockBatch, TrackedUnit
from ..inventory.selectors import inventory_search
from ..overview.api import _remaining_stock_value
from ..sales.models import SaleItem
from ..sales.services import record_sale


class StockV2HardeningTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="stock-v2-hardening@example.com",
            password="Strong-Password-123!",
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Stock V2 Hardening",
            public_handle="stock-v2-hardening",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.owner,
            role="owner",
        )

    def sale_values(self):
        return {
            "sale_type": "retail",
            "customer_name": "Asha",
            "customer_phone": "",
            "customer_region": "Dar es Salaam",
            "discount": Decimal("0"),
            "payment_status": "paid",
            "sold_at": timezone.now(),
        }

    def test_fifo_partial_consumption_uses_oldest_cost_layers(self):
        product = Product.objects.create(
            business=self.business,
            name="FIFO Item",
            sku="FIFO-001",
            unit="piece",
            tracking_mode=Product.TrackingMode.QUANTITY,
            current_quantity=Decimal("20"),
            selling_price=Decimal("50000"),
        )
        first = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_received=Decimal("10"),
            quantity_remaining=Decimal("10"),
            unit_cost=Decimal("30000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=2),
            recorded_by=self.owner,
        )
        second = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_received=Decimal("10"),
            quantity_remaining=Decimal("10"),
            unit_cost=Decimal("35000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=1),
            recorded_by=self.owner,
        )

        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            items=[
                {
                    "source": SaleItem.Source.CATALOG,
                    "product_id": product.id,
                    "quantity": Decimal("12"),
                    "unit_price": Decimal("50000"),
                }
            ],
            **self.sale_values(),
        )

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(sale.cost_of_goods, Decimal("370000"))
        self.assertEqual(first.quantity_remaining, Decimal("0"))
        self.assertEqual(second.quantity_remaining, Decimal("8"))

    def test_selected_individual_unit_uses_its_exact_stock_line_cost(self):
        product = Product.objects.create(
            business=self.business,
            name="Tracked Item",
            sku="TRACK-001",
            unit="piece",
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            current_quantity=Decimal("2"),
            selling_price=Decimal("70000"),
        )
        older = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("1"),
            unit_cost=Decimal("30000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=2),
            recorded_by=self.owner,
        )
        newer = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("1"),
            unit_cost=Decimal("45000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=1),
            recorded_by=self.owner,
        )
        TrackedUnit.objects.create(
            stock_line=older,
            product=product,
            internal_serial="TRACK-OLD",
        )
        selected = TrackedUnit.objects.create(
            stock_line=newer,
            product=product,
            internal_serial="TRACK-NEW",
        )

        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            items=[
                {
                    "source": SaleItem.Source.CATALOG,
                    "product_id": product.id,
                    "tracked_unit_id": selected.id,
                    "quantity": Decimal("1"),
                    "unit_price": Decimal("70000"),
                }
            ],
            **self.sale_values(),
        )

        older.refresh_from_db()
        newer.refresh_from_db()
        selected.refresh_from_db()
        self.assertEqual(sale.cost_of_goods, Decimal("45000"))
        self.assertEqual(older.quantity_remaining, Decimal("1"))
        self.assertEqual(newer.quantity_remaining, Decimal("0"))
        self.assertEqual(selected.status, TrackedUnit.Status.SOLD)

    def test_remaining_stock_value_sums_each_cost_layer(self):
        product = Product.objects.create(
            business=self.business,
            name="Valued Item",
            sku="VALUE-001",
            unit="piece",
            current_quantity=Decimal("8"),
        )
        StockBatch.objects.create(
            product=product,
            quantity_received=Decimal("10"),
            quantity_remaining=Decimal("3"),
            unit_cost=Decimal("30000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=2),
            recorded_by=self.owner,
        )
        StockBatch.objects.create(
            product=product,
            quantity_received=Decimal("10"),
            quantity_remaining=Decimal("5"),
            unit_cost=Decimal("35000"),
            received_unit="piece",
            received_at=timezone.now() - timedelta(days=1),
            recorded_by=self.owner,
        )

        self.assertEqual(
            _remaining_stock_value(business=self.business),
            Decimal("265000"),
        )

    def test_inventory_search_matches_product_family(self):
        family = ProductFamily.objects.create(
            business=self.business,
            name="iPhone 17 Pro Max",
            brand="Apple",
        )
        product = Product.objects.create(
            business=self.business,
            family=family,
            name="iPhone 17 Pro Max",
            sku="IPH17-256-SILVER",
            brand="Apple",
            variant="256GB Silver",
            unit="piece",
        )

        result = inventory_search(
            business=self.business,
            query="iPhone 17 Pro Max",
        )

        self.assertEqual(result["products"][0]["product_id"], str(product.id))
        self.assertEqual(result["products"][0]["family_name"], family.name)
