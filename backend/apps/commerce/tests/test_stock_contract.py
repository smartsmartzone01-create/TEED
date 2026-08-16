from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..inventory.contract import CanonicalStockReceiptCreateContractSerializer
from ..inventory.corrections import correct_stock_structure
from ..inventory.serializers import CanonicalStockReceiptSerializer
from ..services import create_product, create_stock_receipt, record_sale


class CanonicalStockContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="stock-contract@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Stock Contract",
            public_handle="stock-contract",
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
            name="ANKER headphones",
            brand="ANKER",
            variant="",
            unit="piece",
            selling_price=Decimal("20000"),
            tracking_mode="quantity",
            low_stock_threshold=Decimal("0"),
            is_active=True,
        )

    def payload(self, *, quantity="10", unit_cost="10000"):
        return {
            "status": "received",
            "supplier_name": "China Supplier",
            "additional_cost": "5000",
            "received_at": timezone.now(),
            "catalog_items": [{"key": "anker", "product_id": str(self.product.id)}],
            "batches": [
                {
                    "name": "Batch 1",
                    "groups": [
                        {
                            "name": "Headphones",
                            "quantity": quantity,
                            "unit": "piece",
                            "types": [
                                {
                                    "catalog_key": "anker",
                                    "quantity_received": quantity,
                                    "received_unit": "piece",
                                    "unit_cost": unit_cost,
                                    "tracking_mode": "quantity",
                                    "tracked_units": [],
                                }
                            ],
                        }
                    ],
                }
            ],
        }

    def create_canonical_receipt(self, *, quantity="10", unit_cost="10000"):
        serializer = CanonicalStockReceiptCreateContractSerializer(
            data=self.payload(quantity=quantity, unit_cost=unit_cost)
        )
        serializer.is_valid(raise_exception=True)
        return create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            **serializer.validated_data,
        )

    def test_contract_rejects_fractional_countable_products(self):
        serializer = CanonicalStockReceiptCreateContractSerializer(
            data=self.payload(quantity="1.5")
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("whole quantity", str(serializer.errors).lower())

    def test_contract_allows_fractional_measured_units(self):
        payload = self.payload(quantity="1.5")
        payload["batches"][0]["groups"][0]["unit"] = "kilogram"
        payload["batches"][0]["groups"][0]["types"][0]["received_unit"] = "kilogram"
        self.product.unit = "kilogram"
        self.product.save(update_fields=["unit", "updated_at"])
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_output_matches_user_facing_stock_hierarchy(self):
        receipt = self.create_canonical_receipt()
        receipt = receipt.__class__.objects.prefetch_related(
            "lines__product",
            "lines__tracked_units__identifiers",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units__identifiers",
        ).get(pk=receipt.pk)
        data = CanonicalStockReceiptSerializer(receipt).data

        self.assertNotIn("supplier_reference", data)
        self.assertNotIn("notes", data)
        self.assertNotIn("buying_price", data["batches"][0]["groups"][0])
        line = data["batches"][0]["groups"][0]["types"][0]
        self.assertEqual(line["received_unit_cost"], "10000.00")
        self.assertEqual(line["total_buying_cost"], "100000.00")
        self.assertEqual(data["total_buying_value"], "100000.00")

    def test_product_cost_correction_updates_existing_fifo_cost(self):
        receipt = self.create_canonical_receipt(quantity="10", unit_cost="10000")
        line = receipt.lines.get()
        sale = record_sale(
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
                    "quantity": Decimal("2"),
                    "unit_price": Decimal("20000"),
                }
            ],
        )
        self.assertEqual(sale.cost_of_goods, Decimal("20000"))

        correct_stock_structure(
            actor=self.owner,
            business_id=self.business.id,
            receipt_id=receipt.id,
            lines=[{"id": line.id, "unit_cost": Decimal("8000")}],
        )

        sale.refresh_from_db()
        sale_item = sale.items.get()
        allocation = sale_item.allocations.get()
        sale_item.refresh_from_db()
        self.assertEqual(allocation.unit_cost, Decimal("8000"))
        self.assertEqual(sale_item.cost_total, Decimal("16000"))
        self.assertEqual(sale.cost_of_goods, Decimal("16000"))

    def test_group_unit_correction_updates_all_product_lines_before_activity(self):
        second = create_product(
            actor=self.owner,
            business_id=self.business.id,
            name="JBL headphones",
            brand="JBL",
            variant="",
            unit="piece",
            selling_price=Decimal("18000"),
            tracking_mode="quantity",
            low_stock_threshold=Decimal("0"),
            is_active=True,
        )
        payload = self.payload(quantity="10", unit_cost="10000")
        payload["catalog_items"].append({"key": "jbl", "product_id": str(second.id)})
        group = payload["batches"][0]["groups"][0]
        group["types"][0]["quantity_received"] = "5"
        group["types"].append(
            {
                "catalog_key": "jbl",
                "quantity_received": "5",
                "received_unit": "piece",
                "unit_cost": "9000",
                "tracking_mode": "quantity",
                "tracked_units": [],
            }
        )
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt(
            actor=self.owner,
            business_id=self.business.id,
            **serializer.validated_data,
        )
        stock_group = receipt.batches.get().groups.get()

        correct_stock_structure(
            actor=self.owner,
            business_id=self.business.id,
            receipt_id=receipt.id,
            groups=[{"id": stock_group.id, "unit": "pair"}],
        )

        stock_group.refresh_from_db()
        self.product.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(stock_group.unit, "pair")
        self.assertEqual(self.product.unit, "pair")
        self.assertEqual(second.unit, "pair")
        self.assertEqual(
            set(receipt.lines.values_list("received_unit", flat=True)), {"pair"}
        )
