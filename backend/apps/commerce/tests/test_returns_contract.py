from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..sales.models import Sale, SaleItem
from ..returns.selectors import returnable_sales_for_period
from ..returns.services import record_return


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

    def test_return_candidates_are_scoped_to_the_requested_sale_period(self):
        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        inside = self.create_sale(sequence=1, sold_at=start + timezone.timedelta(hours=4))
        self.create_sale(sequence=2, sold_at=start - timezone.timedelta(hours=1))
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
        sale = self.create_sale(sequence=4, sold_at=timezone.now())
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

        record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="refund",
            reason="Customer returned the phone.",
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
