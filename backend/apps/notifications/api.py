from common.pagination import TEEDPagination
from common.responses import PaginatedResponse, SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import UserNotification
from .permissions import IsOnboardingComplete
from .selectors import unread_count, visible_notifications
from .serializers import EmptyNotificationActionSerializer, NotificationSerializer
from .services import read_all_notifications, read_notification


class NotificationBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class NotificationListAPIView(NotificationBaseAPIView):
    serializer_class = NotificationSerializer

    def get(self, request):
        category = request.query_params.get("category", "")
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
        unread_only = request.query_params.get("unread", "").lower() in {"1", "true"}
        paginator = TEEDPagination()
        page = paginator.paginate_queryset(
            visible_notifications(
                user=request.user, category=category, unread_only=unread_only
            ),
            request,
        )
        return PaginatedResponse(
            message="Notifications retrieved successfully.",
            data={
                "notifications": NotificationSerializer(page, many=True).data,
                "unread_count": unread_count(user=request.user),
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
        count = read_all_notifications(user=request.user)
        return SuccessResponse(
            message="All notifications marked as read.",
            data={"updated_notifications": count},
        )
