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
    StockContainer,
    StockGroup,
    StockReceipt,
    TrackedUnit,
    TrackedUnitIdentifier,
    UnitDefinition,
)

admin.site.register(
    [
        Product,
        StockBatch,
        StockContainer,
        StockGroup,
        StockReceipt,
        TrackedUnit,
        TrackedUnitIdentifier,
        UnitDefinition,
        InventoryMovement,
        Sale,
        SaleReturn,
        Expense,
        Budget,
        CommerceDecision,
    ]
)
