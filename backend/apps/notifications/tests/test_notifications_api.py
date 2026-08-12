from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair

from ..models import UserNotification
from ..services import notify_user


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="StrongTestPassword123!",
        username=email.split("@")[0],
        is_email_verified=True,
        onboarding_completed_at=timezone.now(),
    )


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user = create_user("notifications@example.com")
        tokens = issue_token_pair(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.notification = notify_user(
            user=self.user,
            category=UserNotification.Category.SECURITY,
            template=UserNotification.Template.PASSWORD_CHANGED,
            context={"count": 2, "secret": "discarded"},
            action_path="/dashboard/security/activity",
        )

    def test_list_is_paginated_and_reports_unread_count(self):
        response = self.client.get(reverse("notifications:list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["unread_count"], 1)

        self.assertEqual(len(response.data["data"]["notifications"]), 1)
        self.assertEqual(response.data["meta"]["total_records"], 1)
        self.assertEqual(
            response.data["data"]["notifications"][0]["context"], {"count": 2}
        )

    def test_filters_by_category_and_unread_state(self):
        notify_user(
            user=self.user,
            category=UserNotification.Category.SYSTEM,
            template=UserNotification.Template.SYSTEM_ANNOUNCEMENT,
        )
        response = self.client.get(
            reverse("notifications:list"), {"category": "security", "unread": "true"}
        )
        self.assertEqual(len(response.data["data"]["notifications"]), 1)
        self.assertEqual(
            response.data["data"]["notifications"][0]["category"], "security"
        )

    def test_mark_one_and_all_as_read(self):
        one = self.client.post(
            reverse(
                "notifications:read", kwargs={"notification_id": self.notification.id}
            ),
            {},
            format="json",
        )
        self.assertEqual(one.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertIsNotNone(self.notification.read_at)
        notify_user(user=self.user, category="system", template="system_announcement")
        all_response = self.client.post(
            reverse("notifications:read-all"), {}, format="json"
        )
        self.assertEqual(all_response.data["data"]["updated_notifications"], 1)

    def test_cannot_read_another_users_notification(self):
        other = create_user("other-notifications@example.com")
        foreign = notify_user(
            user=other, category="system", template="system_announcement"
        )
        response = self.client.post(
            reverse("notifications:read", kwargs={"notification_id": foreign.id}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        foreign.refresh_from_db()
        self.assertIsNone(foreign.read_at)

    def test_external_action_urls_are_rejected(self):
        with self.assertRaises(ValueError):
            notify_user(
                user=self.user,
                category="system",
                template="system_announcement",
                action_path="https://attacker.example",
            )

    def test_workspace_action_paths_are_allowed(self):
        business_id = "550e8400-e29b-41d4-a716-446655440000"
        notification = notify_user(
            user=self.user,
            category="workspace",
            template="workspace_access_request",
            action_path="/workspace/550e8400-e29b-41d4-a716-446655440000/access-requests",
            scope=UserNotification.Scope.WORKSPACE,
            business_id=business_id,
        )
        self.assertEqual(str(notification.business_id), business_id)
        self.assertEqual(
            notification.action_path,
            "/workspace/550e8400-e29b-41d4-a716-446655440000/access-requests",
        )

    def test_workspace_scope_cannot_target_another_business(self):
        with self.assertRaises(ValueError):
            notify_user(
                user=self.user,
                category="workspace",
                template="workspace_access_request",
                action_path="/workspace/550e8400-e29b-41d4-a716-446655440000/access-requests",
                scope=UserNotification.Scope.WORKSPACE,
                business_id="2ec8d25f-d42e-487c-946f-a0bf9620c489",
            )

    def test_workspace_inbox_and_read_all_are_business_scoped(self):
        business_id = "550e8400-e29b-41d4-a716-446655440000"
        workspace_notification = notify_user(
            user=self.user,
            category="workspace",
            template="business_control_request",
            action_path=f"/workspace/{business_id}/security/control",
            scope=UserNotification.Scope.WORKSPACE,
            business_id=business_id,
        )
        response = self.client.get(
            reverse("notifications:list"),
            {"scope": "workspace", "business_id": business_id},
        )
        self.assertEqual(len(response.data["data"]["notifications"]), 1)
        self.assertEqual(response.data["data"]["unread_count"], 1)

        dashboard = self.client.get(
            reverse("notifications:list"), {"surface": "dashboard"}
        )
        self.assertEqual(len(dashboard.data["data"]["notifications"]), 1)
        self.assertEqual(
            dashboard.data["data"]["notifications"][0]["id"],
            str(self.notification.id),
        )

        self.client.post(
            f"{reverse('notifications:read-all')}?scope=workspace&business_id={business_id}",
            {},
            format="json",
        )
        workspace_notification.refresh_from_db()
        self.notification.refresh_from_db()
        self.assertIsNotNone(workspace_notification.read_at)
        self.assertIsNone(self.notification.read_at)

    def test_deceptive_internal_prefix_is_rejected(self):
        with self.assertRaises(ValueError):
            notify_user(
                user=self.user,
                category="system",
                template="system_announcement",
                action_path="/dashboard-attacker/path",
            )

    def test_expired_notifications_are_hidden(self):
        self.notification.expires_at = timezone.now()
        self.notification.save(update_fields=["expires_at", "updated_at"])
        response = self.client.get(reverse("notifications:list"))
        self.assertEqual(response.data["data"]["notifications"], [])
        self.assertEqual(response.data["data"]["unread_count"], 0)

    def test_authentication_and_onboarding_are_required(self):
        self.user.onboarding_completed_at = None
        self.user.save(update_fields=["onboarding_completed_at", "updated_at"])
        self.assertEqual(
            self.client.get(reverse("notifications:list")).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.client.credentials()
        self.assertEqual(
            self.client.get(reverse("notifications:list")).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
