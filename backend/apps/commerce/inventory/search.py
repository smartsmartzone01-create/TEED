from django.db.models import Q

from .services import current_stock_receipts


def search_stock(*, business, query, limit=8):
    """Search current Stock receipts without projecting cost or tracked identifiers."""
    cleaned = str(query or "").strip()
    receipts = current_stock_receipts(business=business)

    if cleaned:
        receipts = receipts.filter(
            Q(reference__icontains=cleaned)
            | Q(name__icontains=cleaned)
            | Q(supplier_name__icontains=cleaned)
            | Q(lines__product__name__icontains=cleaned)
            | Q(lines__product__sku__icontains=cleaned)
            | Q(lines__product__family__name__icontains=cleaned)
            | Q(batches__name__icontains=cleaned)
            | Q(batches__code__icontains=cleaned)
            | Q(batches__groups__name__icontains=cleaned)
            | Q(batches__groups__code__icontains=cleaned)
            | Q(batches__groups__type_lines__product__name__icontains=cleaned)
            | Q(batches__groups__type_lines__product__sku__icontains=cleaned)
            | Q(
                batches__groups__type_lines__product__family__name__icontains=cleaned
            )
        )

    receipts = receipts.distinct().order_by("-created_at", "-id")[:limit]

    return [
        {
            "type": "stock_receipt",
            "id": str(receipt.id),
            "reference": receipt.reference,
            "title": receipt.name or receipt.reference,
            "subtitle": receipt.supplier_name or receipt.reference,
            "status": receipt.status,
            "module": "commerce.inventory",
            "metadata": {
                "receipt_name": receipt.name,
                "supplier_name": receipt.supplier_name,
                "received_at": receipt.received_at.isoformat()
                if receipt.received_at
                else None,
            },
        }
        for receipt in receipts
    ]


__all__ = ["search_stock"]
