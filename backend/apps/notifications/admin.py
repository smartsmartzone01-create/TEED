from django.contrib import admin

from .models import UserNotification


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "template", "read_at", "created_at")
    list_filter = ("category", "template", "read_at")
    search_fields = ("user__email", "user__username")
    readonly_fields = ("id", "created_at", "updated_at")
