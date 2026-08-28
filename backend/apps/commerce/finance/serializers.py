from decimal import Decimal

from rest_framework import serializers

from .models import Budget, Expense


MANUAL_EXPENSE_CATEGORIES = [
    choice for choice in Expense.Category.choices if choice[0] != Expense.Category.STOCK_EXPENSE
]


class ExpenseListQuerySerializer(serializers.Serializer):
    month = serializers.RegexField(r"^\d{4}-\d{2}$", required=False)
    category = serializers.ChoiceField(choices=MANUAL_EXPENSE_CATEGORIES, required=False)


class ExpenseCreateSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(choices=MANUAL_EXPENSE_CATEGORIES)
    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    class Meta:
        model = Expense
        fields = [
            "category",
            "description",
            "amount",
            "payee",
            "payment_method",
            "reference",
            "notes",
            "incurred_at",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    payment_method_label = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )
    recorded_by_email = serializers.EmailField(source="recorded_by.email", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "category",
            "category_label",
            "description",
            "amount",
            "payee",
            "payment_method",
            "payment_method_label",
            "reference",
            "notes",
            "incurred_at",
            "recorded_by_email",
            "created_at",
        ]


class BudgetCreateSerializer(serializers.ModelSerializer):
    period_type = serializers.ChoiceField(choices=Budget.PeriodType.choices)
    period_start = serializers.DateField(required=True)
    planned_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    class Meta:
        model = Budget
        fields = ["period_type", "period_start", "planned_amount", "notes"]


class BudgetSerializer(serializers.ModelSerializer):
    period_type_label = serializers.CharField(
        source="get_period_type_display",
        read_only=True,
    )

    class Meta:
        model = Budget
        fields = [
            "id",
            "period_type",
            "period_type_label",
            "period_start",
            "planned_amount",
            "notes",
            "created_at",
            "updated_at",
        ]
