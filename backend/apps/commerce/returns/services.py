from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..inventory.models import TrackedUnit
from ..sales.models import SaleItem
from ..services import record_return as legacy_record_return


@transaction.atomic
def record_return(*, actor, business_id, sale_id, items, **values):
    sale_items = {
        str(item.id): item
        for item in SaleItem.objects.select_for_update().filter(
            sale_id=sale_id,
            id__in=[item["sale_item_id"] for item in items],
        )
    }

    for item in items:
        sale_item = sale_items.get(str(item["sale_item_id"]))
        if sale_item is None:
            continue
        if item["condition"] == "sellable" and sale_item.product_id is None:
            raise ValidationError(
                {
                    "items": [
                        "An independent sale item cannot be restored to stock "
                        "automatically. Record it as non-sellable here and receive "
                        "it into stock separately if needed."
                    ]
                }
            )
        if sale_item.tracked_unit_id is not None:
            remaining = sale_item.quantity - sale_item.returned_quantity
            if item["quantity"] != remaining:
                raise ValidationError(
                    {
                        "items": [
                            "An individually tracked item must be returned as the "
                            "whole remaining unit."
                        ]
                    }
                )

    record = legacy_record_return(
        actor=actor,
        business_id=business_id,
        sale_id=sale_id,
        items=items,
        **values,
    )

    for item in items:
        sale_item = sale_items.get(str(item["sale_item_id"]))
        if sale_item is None or sale_item.tracked_unit_id is None:
            continue
        tracked_unit = TrackedUnit.objects.select_for_update().get(
            pk=sale_item.tracked_unit_id
        )
        tracked_unit.status = (
            TrackedUnit.Status.AVAILABLE
            if item["condition"] == "sellable"
            else TrackedUnit.Status.DAMAGED
        )
        tracked_unit.save(update_fields=["status", "updated_at"])

    return record


__all__ = ["record_return"]
