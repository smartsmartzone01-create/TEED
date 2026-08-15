from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..models import InventoryMovement, StockReceipt, StockReceiptAudit
from ..services import create_product, create_stock_receipt, record_sale
from ..stock_polish import (
    AvailabilityProductSerializer,
    PolishedStockReceiptCreateSerializer,
    correct_stock_receipt,
)


class StockPolishTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="stock-polish@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Stock Polish",
            public_handle="stock-polish",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.owner, role="owner"
        )
        self.product = create_product(
            actor=self.owner,
            business_id=self.business.id,
            name="Nike shoes",
            brand="Nike",
            variant="42",
            unit="pair",
            selling_price=Decimal("100000"),
            low_stock_threshold=Decimal("1"),
            is_active=True,
        )

    def create_receipt(self, quantity=Decimal("4")):
        return create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            catalog_items=[{"key": "shoes", "product_id": self.product.id}],
            batches=[
                {
                    "name": "Shoes",
                    "products": [
                        {
                            "catalog_key": "shoes",
                            "quantity_received": quantity,
                            "received_unit": "pair",
                            "unit_cost": Decimal("50000"),
                        }
                    ],
                    "groups": [],
                }
            ],
        )

    def test_available_quantity_is_rendered_without_decimal_noise(self):
        self.product.current_quantity = Decimal("17.000")
        self.product.save(update_fields=["current_quantity", "updated_at"])
        data = AvailabilityProductSerializer(self.product).data
        self.assertEqual(data["current_quantity"], "17")

    def test_countable_stock_rejects_fractional_quantity(self):
        serializer = PolishedStockReceiptCreateSerializer(
            data={
                "status": "received",
                "received_at": timezone.now(),
                "catalog_items": [
                    {"key": "shoes", "product_id": str(self.product.id)}
                ],
                "batches": [
                    {
                        "name": "Shoes",
                        "products": [
                            {
                                "catalog_key": "shoes",
                                "quantity_received": "1.5",
                                "received_unit": "pair",
                            }
                        ],
                        "groups": [],
                    }
                ],
            },
            context={"business_id": self.business.id},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("whole quantity", str(serializer.errors).lower())

    def test_received_stock_can_be_corrected_inside_48_hours(self):
        receipt = self.create_receipt(Decimal("4"))
        line = receipt.lines.get()

        correct_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            receipt_id=receipt.id,
            lines=[{"id": line.id, "quantity": Decimal("3")}],
        )

        line.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(line.quantity_received, Decimal("3"))
        self.assertEqual(line.quantity_remaining, Decimal("3"))
        self.assertEqual(self.product.current_quantity, Decimal("3"))
        correction = InventoryMovement.objects.filter(
            batch=line, kind=InventoryMovement.Kind.CORRECTION
        ).get()
        self.assertEqual(correction.quantity_delta, Decimal("-1"))
        self.assertTrue(StockReceiptAudit.objects.filter(receipt=receipt).exists())

    def test_quantity_cannot_be_reduced_below_stock_already_used(self):
        receipt = self.create_receipt(Decimal("4"))
        line = receipt.lines.get()
        record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            customer_name="",
            customer_phone="",
            discount=Decimal("0"),
            payment_status="paid",
            sold_at=timezone.now(),
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": Decimal("3"),
                    "unit_price": Decimal("100000"),
                }
            ],
        )

        with self.assertRaises(ValidationError):
            correct_stock_receipt(
                actor=self.owner,
                business_id=self.business.id,
                receipt_id=receipt.id,
                lines=[{"id": line.id, "quantity": Decimal("2")}],
            )

    def test_sale_reduces_live_available_quantity(self):
        self.create_receipt(Decimal("4"))
        record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            customer_name="",
            customer_phone="",
            discount=Decimal("0"),
            payment_status="paid",
            sold_at=timezone.now(),
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": Decimal("1"),
                    "unit_price": Decimal("100000"),
                }
            ],
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("3"))
        self.assertEqual(
            AvailabilityProductSerializer(self.product).data["current_quantity"], "3"
        )

    def test_received_stock_correction_closes_after_48_hours(self):
        receipt = self.create_receipt(Decimal("4"))
        StockReceipt.objects.filter(pk=receipt.pk).update(
            created_at=timezone.now() - timedelta(hours=49)
        )
        receipt.refresh_from_db()
        line = receipt.lines.get()

        with self.assertRaises(ValidationError) as error:
            correct_stock_receipt(
                actor=self.owner,
                business_id=self.business.id,
                receipt_id=receipt.id,
                lines=[{"id": line.id, "quantity": Decimal("3")}],
            )
        self.assertIn("48-hour", str(error.exception))
