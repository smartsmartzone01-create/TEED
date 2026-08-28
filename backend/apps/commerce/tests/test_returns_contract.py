from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..returns.selectors import returnable_sales_for_period
from ..returns.services import record_return
from ..sales.models import Sale, SaleAllocation, SaleItem


class ReturnsContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="returns-contract@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Returns Contract Business",
            public_handle="returns-contract",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.owner, role="owner"
        )

    def create_sale(self, *, sequence, sold_at, status=Sale.Status.ACTIVE):
        return Sale.objects.create(
            business=self.business,
            receipt_number=f"RETURN-{sequence:07d}",
            receipt_sequence=sequence,
            status=status,
            sale_mode=Sale.SaleMode.INDEPENDENT,
            transaction_type=Sale.TransactionType.NORMAL,
            sale_type=Sale.SaleType.RETAIL,
            payment_status=Sale.PaymentStatus.PAID,
            sold_at=sold_at,
            recorded_by=self.owner,
        )

    def create_catalog_sale_line(
        self,
        *,
        sequence,
        product,
        quantity=Decimal("1"),
        unit_price=Decimal("15000"),
        cost_total=Decimal("10000"),
    ):
        sale = self.create_sale(sequence=sequence, sold_at=timezone.now())
        sale.sale_mode = Sale.SaleMode.STOCK
        sale.save(update_fields=["sale_mode", "updated_at"])
        line = SaleItem.objects.create(
            sale=sale,
            source=SaleItem.Source.CATALOG,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            line_total=quantity * unit_price,
            cost_total=cost_total,
        )
        return sale, line

    def test_return_candidates_are_scoped_to_the_requested_sale_period(self):
        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        inside = self.create_sale(
            sequence=1,
            sold_at=start + timezone.timedelta(hours=4),
        )
        self.create_sale(
            sequence=2,
            sold_at=start - timezone.timedelta(hours=1),
        )
        self.create_sale(
            sequence=3,
            sold_at=start + timezone.timedelta(hours=5),
            status=Sale.Status.VOIDED,
        )

        sales = list(
            returnable_sales_for_period(
                business=self.business,
                sold_from=start,
                sold_before=start + timezone.timedelta(days=1),
            )
        )

        self.assertEqual([sale.id for sale in sales], [inside.id])

    def test_return_candidates_can_be_found_by_receipt_number(self):
        target = self.create_sale(sequence=4, sold_at=timezone.now())
        self.create_sale(sequence=5, sold_at=timezone.now())

        sales = list(
            returnable_sales_for_period(
                business=self.business,
                receipt_number=target.receipt_number.lower(),
            )
        )

        self.assertEqual([sale.id for sale in sales], [target.id])

    def test_sellable_tracked_return_makes_the_original_unit_available_again(self):
        product = Product.objects.create(
            business=self.business,
            name="Tracked phone",
            sku="ITM-RETURN-1",
            unit="piece",
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            current_quantity=Decimal("0"),
        )
        batch = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("0"),
            unit_cost=Decimal("500000"),
            received_unit="piece",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        unit = TrackedUnit.objects.create(
            stock_line=batch,
            product=product,
            internal_serial="UNIT-RETURN-1",
            status=TrackedUnit.Status.SOLD,
        )
        sale = self.create_sale(sequence=6, sold_at=timezone.now())
        sale.sale_mode = Sale.SaleMode.STOCK
        sale.save(update_fields=["sale_mode", "updated_at"])
        line = SaleItem.objects.create(
            sale=sale,
            source=SaleItem.Source.CATALOG,
            product=product,
            tracked_unit=unit,
            quantity=Decimal("1"),
            unit_price=Decimal("750000"),
            line_total=Decimal("750000"),
            cost_total=Decimal("500000"),
        )

        record = record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="refund",
            reason="damaged",
            refund_amount=Decimal("750000"),
            returned_at=timezone.now(),
            items=[
                {
                    "sale_item_id": line.id,
                    "quantity": Decimal("1"),
                    "condition": "sellable",
                }
            ],
        )

        unit.refresh_from_db()
        product.refresh_from_db()
        self.assertEqual(unit.status, TrackedUnit.Status.AVAILABLE)
        self.assertEqual(product.current_quantity, Decimal("1"))
        self.assertTrue(record.return_number.endswith("-RET-0000001"))
        self.assertEqual(record.refund_amount, Decimal("750000"))
        self.assertEqual(record.recovered_inventory_cost, Decimal("500000"))
        self.assertEqual(record.damaged_loss, Decimal("0"))

    def test_partial_refund_records_actual_cash_without_changing_recovered_cost(self):
        product = Product.objects.create(
            business=self.business,
            name="Refundable charger",
            sku="ITM-REFUND",
            unit="piece",
            tracking_mode=Product.TrackingMode.QUANTITY,
            current_quantity=Decimal("0"),
        )
        batch = StockBatch.objects.create(
            product=product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("0"),
            unit_cost=Decimal("6000"),
            received_unit="piece",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        sale, line = self.create_catalog_sale_line(
            sequence=7,
            product=product,
            unit_price=Decimal("10000"),
            cost_total=Decimal("6000"),
        )
        SaleAllocation.objects.create(
            sale_item=line,
            batch=batch,
            quantity=Decimal("1"),
            unit_cost=Decimal("6000"),
        )

        record = record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="refund",
            reason="defective",
            refund_amount=Decimal("8000"),
            returned_at=timezone.now(),
            items=[
                {
                    "sale_item_id": line.id,
                    "quantity": Decimal("1"),
                    "condition": "sellable",
                }
            ],
        )

        product.refresh_from_db()
        batch.refresh_from_db()
        record.refresh_from_db()
        self.assertEqual(record.total, Decimal("10000"))
        self.assertEqual(record.refund_amount, Decimal("8000"))
        self.assertEqual(record.recovered_inventory_cost, Decimal("6000"))
        self.assertEqual(product.current_quantity, Decimal("1"))
        self.assertEqual(batch.quantity_remaining, Decimal("1"))

    def test_stock_replacement_consumes_fifo_and_records_exact_cost(self):
        returned_product = Product.objects.create(
            business=self.business,
            name="Returned charger",
            sku="ITM-RETURNED",
            unit="piece",
            current_quantity=Decimal("0"),
        )
        sale, line = self.create_catalog_sale_line(
            sequence=8,
            product=returned_product,
            cost_total=Decimal("10000"),
        )
        replacement_product = Product.objects.create(
            business=self.business,
            name="Replacement charger",
            sku="ITM-REPLACE",
            unit="piece",
            tracking_mode=Product.TrackingMode.QUANTITY,
            current_quantity=Decimal("3"),
        )
        old_batch = StockBatch.objects.create(
            product=replacement_product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_received=Decimal("1"),
            quantity_remaining=Decimal("1"),
            unit_cost=Decimal("10000"),
            received_unit="piece",
            received_at=timezone.now() - timezone.timedelta(days=10),
            recorded_by=self.owner,
        )
        new_batch = StockBatch.objects.create(
            product=replacement_product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_received=Decimal("2"),
            quantity_remaining=Decimal("2"),
            unit_cost=Decimal("12000"),
            received_unit="piece",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )

        record = record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="replacement",
            reason="defective",
            returned_at=timezone.now(),
            items=[
                {
                    "sale_item_id": line.id,
                    "quantity": Decimal("1"),
                    "condition": "damaged",
                }
            ],
            replacement={
                "source": "stock",
                "product_id": replacement_product.id,
                "quantity": Decimal("2"),
            },
        )

        replacement_product.refresh_from_db()
        old_batch.refresh_from_db()
        new_batch.refresh_from_db()
        record.refresh_from_db()
        allocations = list(record.replacement.allocations.order_by("batch__received_at"))

        self.assertEqual(replacement_product.current_quantity, Decimal("1"))
        self.assertEqual(old_batch.quantity_remaining, Decimal("0"))
        self.assertEqual(new_batch.quantity_remaining, Decimal("1"))
        self.assertEqual(record.damaged_loss, Decimal("10000"))
        self.assertEqual(record.replacement_cost, Decimal("22000"))
        self.assertEqual([item.quantity for item in allocations], [Decimal("1"), Decimal("1")])
        self.assertEqual(
            [item.unit_cost for item in allocations],
            [Decimal("10000"), Decimal("12000")],
        )

    def test_independent_replacement_records_cost_and_provenance_without_touching_stock(self):
        returned_product = Product.objects.create(
            business=self.business,
            name="Returned cable",
            sku="ITM-CABLE",
            unit="piece",
            current_quantity=Decimal("0"),
        )
        sale, line = self.create_catalog_sale_line(
            sequence=9,
            product=returned_product,
            cost_total=Decimal("5000"),
        )

        record = record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="replacement",
            reason="wrong_item",
            returned_at=timezone.now(),
            items=[
                {
                    "sale_item_id": line.id,
                    "quantity": Decimal("1"),
                    "condition": "damaged",
                }
            ],
            replacement={
                "source": "independent",
                "acquisition_source": "Nearby supplier",
                "item_name": "Emergency replacement cable",
                "item_details": {
                    "brand": "CableCo",
                    "model": "Fast-1",
                    "color": "Black",
                    "identifier_kind": "serial",
                    "identifier_value": "CAB-0001",
                },
                "quantity": Decimal("1"),
                "acquisition_unit_cost": Decimal("7000"),
            },
        )

        record.refresh_from_db()
        self.assertEqual(record.replacement.source, "independent")
        self.assertEqual(record.replacement.acquisition_source, "Nearby supplier")
        self.assertEqual(record.replacement.item_name, "Emergency replacement cable")
        self.assertEqual(record.replacement.item_details["brand"], "CableCo")
        self.assertEqual(record.replacement.item_details["identifier_value"], "CAB-0001")
        self.assertEqual(record.replacement.cost_total, Decimal("7000"))
        self.assertEqual(record.replacement_cost, Decimal("7000"))
        self.assertEqual(record.damaged_loss, Decimal("5000"))
