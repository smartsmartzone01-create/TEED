from rest_framework import serializers

from .models import UserNotification


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = UserNotification
        fields = [
            "id",
            "category",
            "template",
            "context",
            "action_path",
            "scope",
            "business_id",
            "is_read",
            "read_at",
            "created_at",
            "expires_at",
        ]

    def get_is_read(self, instance):
        return instance.read_at is not None


class EmptyNotificationActionSerializer(serializers.Serializer):
    pass
