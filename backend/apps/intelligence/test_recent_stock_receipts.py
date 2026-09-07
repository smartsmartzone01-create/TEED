from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from .context import IntelligenceContext
from .tools import build_commerce_tool_registry


class RecentStockReceiptToolTests(SimpleTestCase):
    def test_inventory_search_without_query_returns_recent_receipts(self):
        business = SimpleNamespace(id="business-1", name="Duka Demo")
        membership = SimpleNamespace(business=business, role="member")
        context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 7),
            role="member",
            permissions=("commerce.view",),
        )
        payload = {
            "query": "",
            "products": [],
            "receipts": [
                {
                    "reference": "MZIGO-000003",
                    "name": "BATCH 1",
                    "status": "received",
                }
            ],
            "tracked_units": [],
        }

        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=False,
        ), patch(
            "apps.intelligence.tools.commerce.inventory_search",
            return_value=payload,
        ) as selector:
            registry = build_commerce_tool_registry(
                membership=membership,
                context=context,
            )
            result = registry.execute("commerce_inventory_search", {})

        selector.assert_called_once_with(
            business=business,
            query="",
            limit=8,
        )
        self.assertEqual(result, payload)

        definition = next(
            item
            for item in registry.definitions()
            if item["function"]["name"] == "commerce_inventory_search"
        )
        parameters = definition["function"]["parameters"]
        self.assertNotIn("required", parameters)
        self.assertIn("recent", definition["function"]["description"].lower())
