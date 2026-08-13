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
)

admin.site.register(
    [
        Product,
        StockBatch,
        InventoryMovement,
        Sale,
        SaleReturn,
        Expense,
        Budget,
        CommerceDecision,
    ]
)
