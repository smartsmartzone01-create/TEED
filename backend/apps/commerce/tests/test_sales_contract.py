from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..sales.models import SaleItem
from ..sales.services import record_sale


class SalesContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="sales-contract@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Sales Contract Business",
            public_handle="sales-contract",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.owner, role="owner"
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

    def test_manual_sale_does_not_require_or_deduct_stock(self):
        product = Product.objects.create(
            business=self.business,
            name="Existing stock",
            sku="ITM-000001",
            unit="piece",
            current_quantity=Decimal("10"),
        )

        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            items=[
                {
                    "source": SaleItem.Source.MANUAL,
                    "item_name": "Untracked service item",
                    "quantity": Decimal("2"),
                    "unit_price": Decimal("5000"),
                }
            ],
            **self.sale_values(),
        )

        product.refresh_from_db()
        line = sale.items.get()
        self.assertEqual(product.current_quantity, Decimal("10"))
        self.assertIsNone(line.product_id)
        self.assertEqual(line.item_name, "Untracked service item")
        self.assertEqual(line.cost_total, Decimal("0"))
        self.assertEqual(sale.customer_region, "Dar es Salaam")
        self.assertEqual(sale.total, Decimal("10000"))

    def test_individual_sale_marks_the_selected_unit_sold(self):
        product = Product.objects.create(
            business=self.business,
            name="Toyota IST",
            sku="ITM-000002",
            unit="piece",
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            selling_price=Decimal("15000000"),
            current_quantity=Decimal("1"),
        )
        batch = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("1"),
            unit_cost=Decimal("10000000"),
            received_unit="piece",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        unit = TrackedUnit.objects.create(
            stock_line=batch,
            product=product,
            internal_serial="UNIT-000001",
            model_name="Toyota IST",
            brand="Toyota",
            color="White",
        )

        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            items=[
                {
                    "source": SaleItem.Source.CATALOG,
                    "product_id": product.id,
                    "tracked_unit_id": unit.id,
                    "quantity": Decimal("1"),
                    "unit_price": Decimal("15000000"),
                }
            ],
            **self.sale_values(),
        )

        product.refresh_from_db()
        batch.refresh_from_db()
        unit.refresh_from_db()
        line = sale.items.get()
        self.assertEqual(unit.status, TrackedUnit.Status.SOLD)
        self.assertEqual(line.tracked_unit_id, unit.id)
        self.assertEqual(batch.quantity_remaining, Decimal("0"))
        self.assertEqual(product.current_quantity, Decimal("0"))
        self.assertEqual(line.cost_total, Decimal("10000000"))
