from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import ProductFamily
from ..inventory.contract import CanonicalStockReceiptCreateContractSerializer
from ..inventory.services import create_stock_receipt_v2
from ..services import create_product


class StockV2ContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="stock-v2@example.com", password="Strong-Password-123!"
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Stock V2",
            public_handle="stock-v2",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business, user=self.owner, role="owner"
        )
        self.cover = create_product(
            actor=self.owner,
            business_id=self.business.id,
            name="iPhone 17 Pro Max Cover",
            brand="",
            variant="Black",
            unit="piece",
            tracking_mode="quantity",
            low_stock_threshold=Decimal("0"),
            is_active=True,
        )
        self.phone = create_product(
            actor=self.owner,
            business_id=self.business.id,
            name="iPhone 17 Pro Max",
            brand="Apple",
            variant="256GB Silver",
            unit="piece",
            tracking_mode="individual",
            low_stock_threshold=Decimal("0"),
            is_active=True,
        )

    def test_flat_receipt_creates_direct_lines_without_batch_or_group(self):
        payload = {
            "name": "September phones and accessories",
            "status": "received",
            "supplier_name": "Supplier A",
            "additional_cost": "5000",
            "received_at": timezone.now(),
            "catalog_items": [
                {"key": "cover", "product_id": str(self.cover.id)},
                {"key": "phone", "product_id": str(self.phone.id)},
            ],
            "lines": [
                {
                    "catalog_key": "cover",
                    "quantity_received": "10",
                    "received_unit": "piece",
                    "unit_cost": "3000",
                    "tracked_units": [],
                },
                {
                    "catalog_key": "phone",
                    "quantity_received": "2",
                    "received_unit": "piece",
                    "unit_cost": "2500000",
                    "tracked_units": [
                        {
                            "color": "Silver",
                            "capacity": "256GB",
                            "identifiers": [{"kind": "imei", "value": "IMEI-001"}],
                        },
                        {
                            "color": "Silver",
                            "capacity": "256GB",
                            "identifiers": [{"kind": "imei", "value": "IMEI-002"}],
                        },
                    ],
                },
            ],
        }
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt_v2(
            actor=self.owner,
            business_id=self.business.id,
            **serializer.validated_data,
        )

        self.assertEqual(receipt.name, "September phones and accessories")
        self.assertEqual(receipt.batches.count(), 0)
        self.assertEqual(receipt.lines.count(), 2)
        self.assertFalse(receipt.lines.filter(stock_group__isnull=False).exists())
        self.assertEqual(receipt.lines.get(product=self.cover).tracking_mode, "quantity")
        self.assertEqual(receipt.lines.get(product=self.phone).tracking_mode, "individual")
        self.assertEqual(receipt.lines.get(product=self.phone).tracked_units.count(), 2)

    def test_receipt_cannot_override_catalog_tracking_policy(self):
        payload = {
            "status": "received",
            "received_at": timezone.now(),
            "catalog_items": [{"key": "phone", "product_id": str(self.phone.id)}],
            "lines": [
                {
                    "catalog_key": "phone",
                    "quantity_received": "1",
                    "received_unit": "piece",
                    "tracking_mode": "quantity",
                    "tracked_units": [],
                }
            ],
        }
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        with self.assertRaises(ValidationError):
            create_stock_receipt_v2(
                actor=self.owner,
                business_id=self.business.id,
                **serializer.validated_data,
            )

    def test_new_catalog_product_can_create_and_reuse_product_family(self):
        payload = {
            "status": "draft",
            "catalog_items": [
                {
                    "key": "iphone-orange",
                    "family_name": "iPhone 17 Pro Max",
                    "item": {
                        "name": "iPhone 17 Pro Max",
                        "brand": "Apple",
                        "variant": "256GB Orange",
                        "unit": "piece",
                        "tracking_mode": "individual",
                    },
                }
            ],
            "lines": [
                {
                    "catalog_key": "iphone-orange",
                    "quantity_received": "1",
                    "received_unit": "piece",
                    "tracked_units": [],
                }
            ],
        }
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt_v2(
            actor=self.owner,
            business_id=self.business.id,
            **serializer.validated_data,
        )

        product = receipt.lines.get().product
        self.assertEqual(product.tracking_mode, "individual")
        self.assertEqual(product.family.name, "iPhone 17 Pro Max")
        self.assertEqual(ProductFamily.objects.filter(business=self.business).count(), 1)

    def test_legacy_batch_payload_remains_accepted(self):
        payload = {
            "status": "received",
            "received_at": timezone.now(),
            "catalog_items": [{"key": "cover", "product_id": str(self.cover.id)}],
            "batches": [
                {
                    "name": "Legacy batch",
                    "groups": [
                        {
                            "name": "Covers",
                            "quantity": "2",
                            "unit": "piece",
                            "types": [
                                {
                                    "catalog_key": "cover",
                                    "quantity_received": "2",
                                    "received_unit": "piece",
                                    "tracking_mode": "quantity",
                                    "tracked_units": [],
                                }
                            ],
                        }
                    ],
                }
            ],
        }
        serializer = CanonicalStockReceiptCreateContractSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt_v2(
            actor=self.owner,
            business_id=self.business.id,
            **serializer.validated_data,
        )

        self.assertEqual(receipt.batches.count(), 1)
        self.assertEqual(receipt.lines.count(), 1)
