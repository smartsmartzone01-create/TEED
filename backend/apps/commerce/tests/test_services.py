from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..models import (
    InventoryMovement,
    Product,
    SaleAllocation,
    TrackedUnit,
    TrackedUnitIdentifier,
    UnitDefinition,
)
from ..serializers import StockBatchSerializer, StockReceiptCreateSerializer
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

    def test_saved_receipt_response_includes_item_code_prices_and_availability(self):
        batch = self.receive("50", "30000")

        line = StockBatchSerializer(batch).data

        self.assertEqual(line["product_name"], "Shoes")
        self.assertEqual(line["product_sku"], self.product.sku)
        self.assertEqual(Decimal(line["selling_price"]), Decimal("50000"))
        self.assertEqual(Decimal(line["quantity_remaining"]), Decimal("50"))

    def test_one_stock_receipt_accepts_many_new_and_existing_items(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            supplier_name="Mixed supplier",
            batches=[
                {
                    "name": "Mixed boxes",
                    "groups": [
                        {
                            "name": "Shoes",
                            "quantity": Decimal("5"),
                            "unit": "pair",
                            "buying_price": Decimal("30000"),
                            "types": [
                                {
                                    "product_id": self.product.id,
                                    "quantity_received": Decimal("5"),
                                    "received_unit": "pair",
                                }
                            ],
                        },
                        {
                            "name": "Sugar",
                            "quantity": Decimal("1"),
                            "unit": "50 kg sack",
                            "base_unit": "kg",
                            "conversion_to_base": Decimal("50"),
                            "types": [
                                {
                                    "item": {"name": "Sugar", "unit": "kg"},
                                    "quantity_received": Decimal("1"),
                                    "received_unit": "50 kg sack",
                                    "conversion_to_base": Decimal("50"),
                                }
                            ],
                        },
                    ],
                }
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
            batches=[
                {
                    "name": "Phone box",
                    "groups": [
                        {
                            "name": "Phones",
                            "quantity": Decimal("2"),
                            "unit": "piece",
                            "types": [
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
                        }
                    ],
                }
            ],
        )
        units = TrackedUnit.objects.filter(stock_line__receipt=receipt)
        self.assertEqual(units.count(), 2)
        self.assertEqual(units.values("internal_serial").distinct().count(), 2)

    def test_individual_item_details_and_identifier_are_saved(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            batches=[
                {
                    "name": "Phone box",
                    "groups": [
                        {
                            "name": "Phones",
                            "quantity": Decimal("1"),
                            "unit": "piece",
                            "types": [
                                {
                                    "item": {
                                        "name": "iPhone",
                                        "unit": "piece",
                                        "tracking_mode": "individual",
                                    },
                                    "quantity_received": Decimal("1"),
                                    "tracked_units": [
                                        {
                                            "model_name": "iPhone 17",
                                            "brand": "Apple",
                                            "color": "Black",
                                            "capacity": "256 GB",
                                            "identifiers": [
                                                {
                                                    "kind": "imei",
                                                    "value": "356789012345678",
                                                }
                                            ],
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
        )
        unit = TrackedUnit.objects.get(stock_line__receipt=receipt)
        self.assertEqual(unit.internal_serial[:5], "UNIT-")
        self.assertEqual(unit.model_name, "iPhone 17")
        self.assertEqual(unit.brand, "Apple")
        self.assertEqual(unit.color, "Black")
        self.assertEqual(unit.capacity, "256 GB")
        self.assertTrue(
            TrackedUnitIdentifier.objects.filter(
                unit=unit, kind="imei", value="356789012345678"
            ).exists()
        )

    def test_custom_unit_is_saved_for_future_stock_receipts(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            batches=[
                {
                    "name": "Fabric",
                    "groups": [
                        {
                            "name": "Kitenge",
                            "quantity": Decimal("2"),
                            "unit": "bolt",
                            "custom_unit_name": "bolt",
                            "base_unit": "meter",
                            "conversion_to_base": Decimal("30"),
                            "types": [
                                {
                                    "item": {"name": "Kitenge", "unit": "meter"},
                                    "quantity_received": Decimal("2"),
                                    "received_unit": "bolt",
                                    "conversion_to_base": Decimal("30"),
                                }
                            ],
                        }
                    ],
                }
            ],
        )
        unit = UnitDefinition.objects.get(business=self.business, name="bolt")
        group = receipt.batches.get().groups.get()
        self.assertTrue(unit.code.startswith("UNITDEF-"))
        self.assertEqual(unit.conversion_to_base, Decimal("30"))
        self.assertEqual(group.unit, "bolt")
        self.assertEqual(group.code, "GRP-001")
        self.assertEqual(group.batch.code, "BAT-001")

    def test_draft_stock_only_changes_availability_when_received(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="draft",
            batches=[
                {
                    "name": "Shoe box",
                    "groups": [
                        {
                            "name": "Shoes",
                            "quantity": Decimal("3"),
                            "unit": "pair",
                            "types": [
                                {
                                    "product_id": self.product.id,
                                    "quantity_received": Decimal("3"),
                                    "received_unit": "pair",
                                }
                            ],
                        }
                    ],
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

    def test_incomplete_individual_stock_stays_draft_and_cannot_be_received(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="draft",
            batches=[
                {
                    "name": "Phone batch",
                    "groups": [
                        {
                            "name": "Phones",
                            "quantity": Decimal("3"),
                            "unit": "piece",
                            "types": [
                                {
                                    "item": {
                                        "name": "Used iPhone 15",
                                        "unit": "piece",
                                        "tracking_mode": "individual",
                                    },
                                    "tracking_mode": "individual",
                                    "quantity_received": Decimal("3"),
                                    "tracked_units": [
                                        {
                                            "identifiers": [
                                                {"kind": "imei", "value": "ONE"}
                                            ]
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
        )
        line = receipt.lines.get()
        self.assertEqual(receipt.status, "draft")
        self.assertEqual(line.tracking_mode, "individual")
        self.assertEqual(line.tracked_units.count(), 1)
        with self.assertRaises(ValidationError):
            receive_draft_stock(
                actor=self.owner,
                business_id=self.business.id,
                receipt_id=receipt.id,
            )

    def test_existing_product_can_use_different_tracking_per_stock_line(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            batches=[
                {
                    "name": "Shoe batch",
                    "groups": [
                        {
                            "name": "Shoes",
                            "quantity": Decimal("1"),
                            "unit": "pair",
                            "types": [
                                {
                                    "product_id": self.product.id,
                                    "tracking_mode": "individual",
                                    "quantity_received": Decimal("1"),
                                    "tracked_units": [{}],
                                }
                            ],
                        }
                    ],
                }
            ],
        )
        self.assertEqual(receipt.lines.get().tracking_mode, "individual")
        self.assertEqual(self.product.tracking_mode, "quantity")

    def test_batch_catalog_allocates_one_identity_to_direct_and_grouped_stock(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            catalog_items=[{"key": "iphone", "product_id": self.product.id}],
            batches=[
                {
                    "name": "Direct phones",
                    "products": [
                        {
                            "catalog_key": "iphone",
                            "quantity_received": Decimal("2"),
                            "received_unit": "pair",
                        }
                    ],
                    "groups": [],
                },
                {
                    "name": "Grouped phones",
                    "products": [],
                    "groups": [
                        {
                            "name": "Shoes",
                            "quantity": Decimal("3"),
                            "unit": "pair",
                            "types": [
                                {
                                    "catalog_key": "iphone",
                                    "quantity_received": Decimal("3"),
                                }
                            ],
                        }
                    ],
                },
            ],
        )
        self.assertEqual(receipt.lines.count(), 2)
        self.assertEqual(receipt.lines.filter(stock_group__isnull=True).count(), 1)
        self.assertEqual(
            set(receipt.lines.values_list("product_id", flat=True)), {self.product.id}
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_quantity, Decimal("5"))

    def test_new_catalog_identity_keeps_its_base_unit_for_calculation(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            catalog_items=[
                {
                    "key": "nails",
                    "item": {"name": "Nails", "unit": "kilogram"},
                }
            ],
            batches=[
                {
                    "name": "Hardware",
                    "products": [
                        {
                            "catalog_key": "nails",
                            "quantity_received": Decimal("100"),
                            "received_unit": "kilogram",
                        }
                    ],
                    "groups": [],
                }
            ],
        )
        nails = Product.objects.get(name="Nails")
        self.assertEqual(nails.unit, "kilogram")
        self.assertTrue(nails.sku.startswith("ITM-"))
        self.assertEqual(receipt.lines.get().quantity_received, Decimal("100"))
        self.assertEqual(nails.current_quantity, Decimal("100"))

    def test_batch_groups_create_types_after_groups(self):
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            status="received",
            received_at=timezone.now(),
            batches=[
                {
                    "name": "Clothing batch",
                    "groups": [
                        {
                            "name": "Shoes",
                            "quantity": Decimal("10"),
                            "unit": "pair",
                            "types": [
                                {
                                    "item": {"name": "Adidas", "unit": "pair"},
                                    "quantity_received": Decimal("4"),
                                    "received_unit": "pair",
                                },
                                {
                                    "item": {"name": "Nike", "unit": "pair"},
                                    "quantity_received": Decimal("6"),
                                    "received_unit": "pair",
                                },
                            ],
                        },
                        {
                            "name": "T-shirts",
                            "quantity": Decimal("10"),
                            "unit": "piece",
                            "types": [
                                {
                                    "item": {"name": "T-shirts", "unit": "piece"},
                                    "quantity_received": Decimal("10"),
                                }
                            ],
                        },
                        {
                            "name": "Jeans",
                            "quantity": Decimal("10"),
                            "unit": "piece",
                            "types": [
                                {
                                    "item": {"name": "Jeans", "unit": "piece"},
                                    "quantity_received": Decimal("10"),
                                }
                            ],
                        },
                    ],
                }
            ],
        )
        batch = receipt.batches.get()
        self.assertEqual(batch.groups.count(), 3)
        self.assertEqual(batch.groups.get(name="Shoes").type_lines.count(), 2)
        self.assertEqual(receipt.lines.count(), 4)
        self.assertEqual(
            sum(receipt.lines.values_list("quantity_remaining", flat=True)),
            Decimal("30"),
        )

    def test_type_quantities_must_equal_group_quantity(self):
        serializer = StockReceiptCreateSerializer(
            data={
                "status": "received",
                "received_at": timezone.now().isoformat(),
                "batches": [
                    {
                        "name": "Shoe box",
                        "groups": [
                            {
                                "name": "Shoes",
                                "quantity": "10",
                                "unit": "pair",
                                "types": [
                                    {
                                        "item": {"name": "Nike", "unit": "pair"},
                                        "quantity_received": "4",
                                        "received_unit": "pair",
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        )
        self.assertFalse(serializer.is_valid())

    def test_catalog_identification_payload_accepts_direct_stock(self):
        serializer = StockReceiptCreateSerializer(
            data={
                "status": "received",
                "received_at": timezone.now().isoformat(),
                "catalog_items": [
                    {
                        "key": "nails",
                        "item": {"name": "Nails", "unit": "kilogram"},
                    }
                ],
                "batches": [
                    {
                        "name": "Hardware",
                        "products": [
                            {
                                "catalog_key": "nails",
                                "quantity_received": "100",
                                "received_unit": "kilogram",
                            }
                        ],
                        "groups": [],
                    }
                ],
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

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
