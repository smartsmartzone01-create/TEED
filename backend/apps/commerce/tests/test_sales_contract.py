from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit, TrackedUnitIdentifier
from ..sales.models import Sale, SaleItem
from ..sales.serializers import SaleCreateSerializer, SaleSerializer
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
        self.assertIsNone(SaleSerializer(sale).data["items"][0]["tracked_unit_details"])

    def test_individual_sale_marks_the_selected_unit_sold(self):
        product = Product.objects.create(
            business=self.business,
            name="Toyota vehicles",
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
            capacity="1.5L",
        )
        TrackedUnitIdentifier.objects.create(
            unit=unit,
            kind=TrackedUnitIdentifier.Kind.CHASSIS,
            value="NCP60-1234567",
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

        serialized = SaleSerializer(sale).data["items"][0]
        self.assertEqual(serialized["product_name"], "Toyota vehicles")
        self.assertEqual(serialized["tracked_unit_details"]["model_name"], "Toyota IST")
        self.assertEqual(serialized["tracked_unit_details"]["color"], "White")
        self.assertEqual(serialized["tracked_unit_details"]["capacity"], "1.5L")
        self.assertEqual(
            serialized["tracked_unit_details"]["identifiers"],
            [{"kind": "chassis", "value": "NCP60-1234567"}],
        )

    def test_trade_in_values_are_negotiated_not_forced_to_balance(self):
        serializer = SaleCreateSerializer(
            data={
                "transaction_type": "trade_in",
                "sale_mode": "independent",
                "sale_type": "retail",
                "payment_status": "paid",
                "sold_at": timezone.now().isoformat(),
                "items": [
                    {
                        "source": "manual",
                        "item_name": "iPhone 17",
                        "quantity": "1",
                        "unit_price": "4000000",
                    }
                ],
                "trade_in": {
                    "incoming_item_name": "iPhone 16",
                    "incoming_value": "2000000",
                    "cash_top_up": "2500000",
                },
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_trade_in_can_add_received_item_to_stock_automatically(self):
        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            transaction_type=Sale.TransactionType.TRADE_IN,
            sale_mode=Sale.SaleMode.INDEPENDENT,
            items=[
                {
                    "source": SaleItem.Source.MANUAL,
                    "item_name": "iPhone 17",
                    "item_details": {"model": "iPhone 17 Pro"},
                    "acquisition_unit_cost": Decimal("2000000"),
                    "quantity": Decimal("1"),
                    "unit_price": Decimal("2500000"),
                }
            ],
            trade_in={
                "incoming_item_name": "iPhone 16",
                "incoming_item_details": {
                    "brand": "Apple",
                    "model": "iPhone 16 Pro",
                    "color": "Black",
                    "capacity": "256GB",
                    "condition": "Used",
                    "unit": "piece",
                    "identifier_kind": "imei",
                    "identifier_value": "356789012345678",
                },
                "incoming_value": Decimal("1700000"),
                "cash_top_up": Decimal("1000000"),
                "add_to_stock": True,
            },
            **self.sale_values(),
        )

        detail = sale.trade_in_detail
        self.assertEqual(sale.total, Decimal("2500000"))
        self.assertEqual(sale.cost_of_goods, Decimal("2000000"))
        self.assertEqual(detail.incoming_value, Decimal("1700000"))
        self.assertEqual(detail.cash_top_up, Decimal("1000000"))
        self.assertIsNotNone(detail.stock_receipt_id)
        self.assertIsNotNone(detail.stock_product_id)

        receipt = detail.stock_receipt
        self.assertEqual(receipt.batches.count(), 1)
        self.assertEqual(receipt.batches.get().name, f"Trade-in {sale.receipt_number}")

        product = detail.stock_product
        product.refresh_from_db()
        self.assertEqual(product.name, "iPhone 16")
        self.assertEqual(product.current_quantity, Decimal("1"))
        unit = product.tracked_units.get()
        self.assertEqual(unit.model_name, "iPhone 16 Pro")
        self.assertEqual(unit.status, TrackedUnit.Status.AVAILABLE)
        self.assertEqual(
            unit.identifiers.get(kind=TrackedUnitIdentifier.Kind.IMEI).value,
            "356789012345678",
        )

        serialized = SaleSerializer(sale, context={"show_costs": True}).data
        self.assertEqual(serialized["transaction_type"], "trade_in")
        self.assertEqual(serialized["trade_in"]["incoming_item_name"], "iPhone 16")
        self.assertTrue(serialized["trade_in"]["stock_receipt_reference"])
        self.assertEqual(serialized["gross_profit"], Decimal("700000"))
