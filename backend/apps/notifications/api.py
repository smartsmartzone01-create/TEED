from uuid import UUID

from common.pagination import TEEDPagination
from common.responses import PaginatedResponse, SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import UserNotification
from .permissions import IsOnboardingComplete
from .selectors import unread_count, visible_notifications
from .serializers import EmptyNotificationActionSerializer, NotificationSerializer
from .services import read_all_notifications, read_notification


def validated_business_id(value):
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError as error:
        raise ValidationError(
            {
                "business_id": [
                    {"code": "invalid", "message": "Enter a valid Business UUID."}
                ]
            }
        ) from error


class NotificationBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class NotificationListAPIView(NotificationBaseAPIView):
    serializer_class = NotificationSerializer

    def get(self, request):
        category = request.query_params.get("category", "")
        scope = request.query_params.get("scope", "")
        business_id = validated_business_id(request.query_params.get("business_id"))
        surface = request.query_params.get("surface", "")
        if category and category not in UserNotification.Category.values:
            raise ValidationError(
                {
                    "category": [
                        {
                            "code": "invalid_choice",
                            "message": "Select a valid notification category.",
                        }
                    ]
                }
            )
        if scope and scope not in UserNotification.Scope.values:
            raise ValidationError(
                {
                    "scope": [
                        {
                            "code": "invalid_choice",
                            "message": "Select a valid notification scope.",
                        }
                    ]
                }
            )
        if surface and surface != "dashboard":
            raise ValidationError(
                {
                    "surface": [
                        {
                            "code": "invalid_choice",
                            "message": "Select a valid notification surface.",
                        }
                    ]
                }
            )
        if business_id and scope == UserNotification.Scope.WORKSPACE:
            from apps.commerce.financing.services import (
                sync_financing_due_notifications,
            )

            try:
                sync_financing_due_notifications(
                    actor=request.user,
                    business_id=business_id,
                )
            except (NotFound, PermissionDenied, ValidationError):
                # Notification access must not be blocked when Financing is not
                # available to this member or Business.
                pass
        unread_only = request.query_params.get("unread", "").lower() in {"1", "true"}
        paginator = TEEDPagination()
        page = paginator.paginate_queryset(
            visible_notifications(
                user=request.user,
                category=category,
                unread_only=unread_only,
                scope=scope,
                business_id=business_id,
                surface=surface,
            ),
            request,
        )
        return PaginatedResponse(
            message="Notifications retrieved successfully.",
            data={
                "notifications": NotificationSerializer(page, many=True).data,
                "unread_count": unread_count(
                    user=request.user,
                    scope=scope,
                    business_id=business_id,
                    surface=surface,
                ),
            },
            page=paginator.page.number,
            page_size=paginator.get_page_size(request),
            total_records=paginator.page.paginator.count,
            total_pages=paginator.page.paginator.num_pages,
            has_next=paginator.page.has_next(),
            has_previous=paginator.page.has_previous(),
        )


@method_decorator(csrf_protect, name="dispatch")
class NotificationReadAPIView(NotificationBaseAPIView):
    serializer_class = EmptyNotificationActionSerializer

    def post(self, request, notification_id):
        notification = read_notification(
            user=request.user, notification_id=notification_id
        )
        if notification is None:
            raise NotFound("Notification not found.", code="notification_not_found")
        return SuccessResponse(
            message="Notification marked as read.",
            data=NotificationSerializer(notification).data,
        )


@method_decorator(csrf_protect, name="dispatch")
class NotificationReadAllAPIView(NotificationBaseAPIView):
    serializer_class = EmptyNotificationActionSerializer

    def post(self, request):
        scope = request.query_params.get("scope", "")
        business_id = validated_business_id(request.query_params.get("business_id"))
        surface = request.query_params.get("surface", "")
        if scope and scope not in UserNotification.Scope.values:
            raise ValidationError(
                {
                    "scope": [
                        {
                            "code": "invalid_choice",
                            "message": "Select a valid notification scope.",
                        }
                    ]
                }
            )
        if surface and surface != "dashboard":
            raise ValidationError(
                {
                    "surface": [
                        {
                            "code": "invalid_choice",
                            "message": "Select a valid notification surface.",
                        }
                    ]
                }
            )
        count = read_all_notifications(
            user=request.user,
            scope=scope,
            business_id=business_id,
            surface=surface,
        )
        return SuccessResponse(
            message="All notifications marked as read.",
            data={"updated_notifications": count},
        )
