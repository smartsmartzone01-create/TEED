from common.responses import SuccessResponse
from django.db.models import Sum
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from .models import (
    Budget,
    Expense,
    InventoryMovement,
    Product,
    Sale,
    SaleReturn,
    StockBatch,
)
from .serializers import (
    AdjustmentSerializer,
    BudgetSerializer,
    DecisionSerializer,
    ExpenseSerializer,
    InventoryMovementSerializer,
    ProductSerializer,
    ReturnCreateSerializer,
    ReturnSerializer,
    SaleCreateSerializer,
    SaleSerializer,
    SaleVoidSerializer,
    StockBatchSerializer,
    StockReceiptSerializer,
)
from .services import (
    adjust_stock,
    commerce_membership,
    commerce_overview,
    create_expense,
    create_product,
    edit_sale,
    receive_stock,
    record_return,
    record_sale,
    set_budget,
    void_sale,
)


class CommerceBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class CommerceOverviewAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        data = commerce_overview(user=request.user, business_id=business_id)
        return SuccessResponse(
            message="Commerce overview retrieved successfully.",
            data={
                "pulse": data["pulse"],
                "decisions": DecisionSerializer(data["decisions"], many=True).data,
                "recent_sales": SaleSerializer(
                    data["recent_sales"],
                    many=True,
                    context={"show_costs": data["pulse"]["can_manage_finance"]},
                ).data,
            },
        )


class ProductListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = Product.objects.filter(business=membership.business)
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={"products": ProductSerializer(products, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = create_product(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Product created successfully.",
            data=ProductSerializer(product).data,
            status_code=status.HTTP_201_CREATED,
        )


class StockBatchListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        batches = StockBatch.objects.select_related("product").filter(
            product__business=membership.business
        )
        movements = InventoryMovement.objects.select_related("product").filter(
            business=membership.business
        )[:100]
        return SuccessResponse(
            message="Inventory retrieved successfully.",
            data={
                "batches": StockBatchSerializer(batches, many=True).data,
                "movements": InventoryMovementSerializer(movements, many=True).data,
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = StockReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = receive_stock(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Stock received successfully.",
            data=StockBatchSerializer(batch).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdjustmentCreateAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = AdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        movement = adjust_stock(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Stock adjustment recorded successfully.",
            data=InventoryMovementSerializer(movement).data,
            status_code=status.HTTP_201_CREATED,
        )


class SaleListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        sales = Sale.objects.prefetch_related("items__product").filter(
            business=membership.business, status=Sale.Status.ACTIVE
        )[:100]
        return SuccessResponse(
            message="Sales retrieved successfully.",
            data={
                "sales": SaleSerializer(
                    sales,
                    many=True,
                    context={
                        "show_costs": role_has_permission(
                            membership.role, WorkspacePermission.MANAGE_FINANCE
                        )
                    },
                ).data
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = record_sale(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        sale = Sale.objects.prefetch_related("items__product").get(pk=sale.pk)
        return SuccessResponse(
            message="Sale recorded and inventory updated successfully.",
            data=SaleSerializer(sale).data,
            status_code=status.HTTP_201_CREATED,
        )


class SaleDetailAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, sale_id):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = edit_sale(
            actor=request.user,
            business_id=business_id,
            sale_id=sale_id,
            **serializer.validated_data,
        )
        sale = Sale.objects.prefetch_related("items__product").get(pk=sale.pk)
        return SuccessResponse(
            message="Sale corrected successfully.", data=SaleSerializer(sale).data
        )


class SaleVoidAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id, sale_id):
        serializer = SaleVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = void_sale(
            actor=request.user,
            business_id=business_id,
            sale_id=sale_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Sale voided and archived successfully.",
            data=SaleSerializer(sale).data,
        )


class ReturnListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        records = SaleReturn.objects.select_related("sale").filter(
            sale__business=membership.business
        )
        return SuccessResponse(
            message="Returns retrieved successfully.",
            data={"returns": ReturnSerializer(records, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = record_return(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Return recorded successfully.",
            data=ReturnSerializer(record).data,
            status_code=status.HTTP_201_CREATED,
        )


class ExpenseListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        expenses = Expense.objects.filter(business=membership.business)[:100]
        return SuccessResponse(
            message="Expenses retrieved successfully.",
            data={"expenses": ExpenseSerializer(expenses, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = create_expense(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Expense recorded successfully.",
            data=ExpenseSerializer(expense).data,
            status_code=status.HTTP_201_CREATED,
        )


class BudgetListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        budgets = Budget.objects.filter(business=membership.business)
        payload = []
        for budget in budgets:
            actual = (
                Expense.objects.filter(
                    business=membership.business,
                    category=budget.category,
                    incurred_at__year=budget.month.year,
                    incurred_at__month=budget.month.month,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )
            payload.append(
                {
                    **BudgetSerializer(budget).data,
                    "actual_amount": actual,
                    "remaining_amount": budget.planned_amount - actual,
                }
            )
        return SuccessResponse(
            message="Budgets retrieved successfully.", data={"budgets": payload}
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = BudgetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        budget = set_budget(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Budget saved successfully.",
            data=BudgetSerializer(budget).data,
            status_code=status.HTTP_201_CREATED,
        )
