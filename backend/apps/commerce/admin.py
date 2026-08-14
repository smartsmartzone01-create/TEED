from django.contrib import admin

from .models import (
    Budget,
    CommerceDecision,
    Expense,
    InventoryMovement,
    Product,
    Sale,
    SaleReturn,
    StockBatch,
    StockReceipt,
    TrackedUnit,
)

admin.site.register(
    [
        Product,
        StockBatch,
        StockReceipt,
        TrackedUnit,
        InventoryMovement,
        Sale,
        SaleReturn,
        Expense,
        Budget,
        CommerceDecision,
    ]
)
