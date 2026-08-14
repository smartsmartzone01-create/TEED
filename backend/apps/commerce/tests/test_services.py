from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..models import InventoryMovement, Product, SaleAllocation, TrackedUnit
from ..services import (
    commerce_overview,
    create_expense,
    create_product,
    create_stock_receipt,
    edit_sale,
    receive_draft_stock,
    receive_stock,
    record_return,
    record_sale,
    void_sale,
)


class CommerceServiceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="commerce@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="KJ Commerce",
            public_handle="kj-commerce",
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
            name="Shoes",
            sku="SHOE-1",
            variant="Blue / 42",
            unit="pair",
            selling_price="50000",
            low_stock_threshold="5",
            is_active=True,
        )

    def receive(self, quantity, cost, days=0):
        return receive_stock(
            actor=self.owner,
            business_id=self.business.id,
            product_id=self.product.id,
            quantity_received=Decimal(quantity),
            unit_cost=Decimal(cost),
            additional_cost=0,
            received_at=timezone.now() + timezone.timedelta(days=days),
            reference=f"B-{cost}",
            supplier_name="Supplier",
        )

    def test_stock_receipt_creates_movement_and_balance(self):
        batch = self.receive("50", "30000")
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("50"))
        self.assertEqual(batch.quantity_remaining, Decimal("50"))
        self.assertEqual(InventoryMovement.objects.get().quantity_delta, Decimal("50"))

    def test_one_stock_receipt_accepts_many_new_and_existing_items(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            supplier_name="Mixed supplier",
            lines=[
                {
                    "product_id": self.product.id,
                    "quantity_received": Decimal("5"),
                    "received_unit": "pair",
                    "unit_cost": Decimal("30000"),
                },
                {
                    "item": {"name": "Sugar", "unit": "kg"},
                    "quantity_received": Decimal("1"),
                    "received_unit": "50 kg sack",
                    "conversion_to_base": Decimal("50"),
                },
            ],
        )
        self.product.refresh_from_db()
        sugar = Product.objects.get(name="Sugar")
        self.assertEqual(receipt.reference, "MZIGO-000001")
        self.assertEqual(receipt.lines.count(), 2)
        self.assertEqual(self.product.current_quantity, Decimal("5"))
        self.assertEqual(sugar.current_quantity, Decimal("50"))
        self.assertTrue(sugar.sku.startswith("ITM-"))

    def test_individual_items_receive_generated_internal_serials(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            lines=[
                {
                    "item": {
                        "name": "iPhone 17",
                        "unit": "piece",
                        "tracking_mode": "individual",
                    },
                    "quantity_received": Decimal("2"),
                    "received_unit": "piece",
                    "tracked_units": [
                        {"imei": "111111111111111"},
                        {"serial_number": "PHONE-002"},
                    ],
                }
            ],
        )
        units = TrackedUnit.objects.filter(stock_line__receipt=receipt)
        self.assertEqual(units.count(), 2)
        self.assertEqual(units.values("internal_serial").distinct().count(), 2)

    def test_draft_stock_only_changes_availability_when_received(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="draft",
            lines=[
                {
                    "product_id": self.product.id,
                    "quantity_received": Decimal("3"),
                    "received_unit": "pair",
                }
            ],
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("0"))
        receive_draft_stock(
            actor=self.owner,
            business_id=self.business.id,
            receipt_id=receipt.id,
            received_at=timezone.now(),
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("3"))

    def test_sale_allocates_fifo_across_batches_and_calculates_profit(self):
        first = self.receive("2", "30000")
        second = self.receive("50", "35000", days=1)
        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            customer_name="Customer",
            customer_phone="+255700000000",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now() + timezone.timedelta(days=2),
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": Decimal("5"),
                    "unit_price": Decimal("50000"),
                }
            ],
        )
        first.refresh_from_db()
        second.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(first.quantity_remaining, 0)
        self.assertEqual(second.quantity_remaining, 47)
        self.assertEqual(self.product.current_quantity, 47)
        self.assertEqual(sale.total, Decimal("250000"))
        self.assertEqual(sale.cost_of_goods, Decimal("165000"))
        self.assertEqual(SaleAllocation.objects.count(), 2)
        self.assertEqual(sale.receipt_number, "KJCOMMER-0000001")

    def test_sale_rejects_insufficient_stock_without_partial_records(self):
        self.receive("2", "30000")
        with self.assertRaises(ValidationError):
            record_sale(
                actor=self.owner,
                business_id=self.business.id,
                sale_type="retail",
                discount=0,
                payment_status="paid",
                sold_at=timezone.now(),
                items=[{"product_id": self.product.id, "quantity": Decimal("3")}],
            )
        self.assertEqual(self.business.sales.count(), 0)

    def test_business_pulse_explains_operating_result(self):
        self.receive("10", "30000")
        record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now(),
            items=[{"product_id": self.product.id, "quantity": Decimal("2")}],
        )
        create_expense(
            actor=self.owner,
            business_id=self.business.id,
            category="transport",
            description="Delivery",
            amount=Decimal("5000"),
            incurred_at=timezone.now(),
        )
        pulse = commerce_overview(user=self.owner, business_id=self.business.id)[
            "pulse"
        ]
        self.assertEqual(pulse["revenue"], Decimal("100000"))
        self.assertEqual(pulse["gross_profit"], Decimal("40000"))
        self.assertEqual(pulse["operating_result"], Decimal("35000"))

    def test_service_workspace_cannot_use_inventory_commerce(self):
        self.business.workspace_type = Business.WorkspaceType.SERVICE
        self.business.save()
        with self.assertRaises(PermissionDenied):
            commerce_overview(user=self.owner, business_id=self.business.id)

    def test_sellable_return_restores_the_correct_fifo_batches(self):
        first = self.receive("2", "30000")
        second = self.receive("4", "35000", days=1)
        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now(),
            items=[{"product_id": self.product.id, "quantity": Decimal("5")}],
        )
        sale_item = sale.items.get()
        record_return(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            resolution="refund",
            reason="Customer changed their mind.",
            returned_at=timezone.now(),
            items=[
                {
                    "sale_item_id": sale_item.id,
                    "quantity": Decimal("2"),
                    "condition": "sellable",
                }
            ],
        )
        first.refresh_from_db()
        second.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(first.quantity_remaining, 0)
        self.assertEqual(second.quantity_remaining, 3)
        self.assertEqual(self.product.current_quantity, 3)

    def test_manager_business_pulse_hides_financial_costs(self):
        manager = User.objects.create_user(
            email="manager@example.com", password="Strong-Password-123!"
        )
        BusinessMembership.objects.create(
            business=self.business, user=manager, role="manager"
        )
        pulse = commerce_overview(user=manager, business_id=self.business.id)["pulse"]
        self.assertIsNone(pulse["cost_of_goods"])
        self.assertIsNone(pulse["gross_profit"])
        self.assertIsNone(pulse["stock_value"])

    def test_member_can_edit_own_sale_today(self):
        self.receive("10", "30000")
        member = User.objects.create_user(
            email="salesperson@example.com", password="Strong-Password-123!"
        )
        BusinessMembership.objects.create(
            business=self.business, user=member, role="member"
        )
        sale = record_sale(
            actor=member,
            business_id=self.business.id,
            sale_type="retail",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now(),
            items=[{"product_id": self.product.id, "quantity": Decimal("2")}],
        )
        edit_sale(
            actor=member,
            business_id=self.business.id,
            sale_id=sale.id,
            sale_type="retail",
            customer_name="Corrected customer",
            customer_phone="",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now(),
            items=[{"product_id": self.product.id, "quantity": Decimal("3")}],
        )
        self.product.refresh_from_db()
        sale.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("7"))
        self.assertEqual(sale.customer_name, "Corrected customer")
        self.assertEqual(sale.audit_events.get().action, "edit")

    def test_owner_voids_sale_and_stock_is_restored(self):
        self.receive("5", "30000")
        sale = record_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_type="retail",
            discount=0,
            payment_status="paid",
            sold_at=timezone.now(),
            items=[{"product_id": self.product.id, "quantity": Decimal("2")}],
        )
        void_sale(
            actor=self.owner,
            business_id=self.business.id,
            sale_id=sale.id,
            reason="Duplicate receipt",
        )
        self.product.refresh_from_db()
        sale.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("5"))
        self.assertEqual(sale.status, "voided")
