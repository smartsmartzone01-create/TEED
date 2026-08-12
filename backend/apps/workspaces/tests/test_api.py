from io import BytesIO
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair

from ..models import Business, BusinessMembership
from ..policy import WorkspaceRole
from ..services import create_business
from .factories import create_user


class WorkspaceAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("api-owner@example.com")
        self.outsider = create_user("api-outsider@example.com")
        self.authenticate(self.owner)

    def test_create_and_list_business_uses_uuid_contract(self):
        created = self.client.post(
            reverse("workspaces:business-list"),
            {
                "name": "API Business",
                "country_code": "tz",
                "workspace_type": Business.WorkspaceType.BUSINESS,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["data"]["country_code"], "TZ")
        self.assertEqual(len(created.data["data"]["id"]), 36)
        self.assertEqual(created.data["data"]["public_handle"], "api-business")
        self.assertIn("business_operations", created.data["data"]["capabilities"])
        listed = self.client.get(reverse("workspaces:business-list"))
        self.assertEqual(len(listed.data["data"]["businesses"]), 1)
        self.assertEqual(
            listed.data["data"]["businesses"][0]["membership"]["role"],
            WorkspaceRole.OWNER,
        )

    def test_duplicate_business_names_receive_unique_public_handles(self):
        first = create_business(user=self.owner, name="Shared Name")
        second = create_business(user=self.owner, name="Shared Name")
        self.assertEqual(first.public_handle, "shared-name")
        self.assertTrue(second.public_handle.startswith("shared-name-"))
        self.assertNotEqual(first.public_handle, second.public_handle)

    def test_business_discovery_returns_minimal_public_identity(self):
        discoverable = create_business(
            user=self.owner,
            name="Afya Services",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.SERVICE,
        )
        create_business(
            user=self.owner,
            name="Afya Personal",
            workspace_type=Business.WorkspaceType.PERSONAL_BRAND,
        )
        response = self.client.get(
            reverse("workspaces:business-discovery"), {"q": "afya"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["businesses"]), 1)
        result = response.data["data"]["businesses"][0]
        self.assertEqual(result["id"], str(discoverable.id))
        self.assertEqual(result["public_handle"], "afya-services")
        self.assertNotIn("created_at", result)

    def test_business_discovery_accepts_short_names_and_exact_uuid(self):
        business = create_business(
            user=self.owner,
            name="KJ",
            country_code="TZ",
        )

        short_name_response = self.client.get(
            reverse("workspaces:business-discovery"), {"q": "KJ"}
        )
        uuid_response = self.client.get(
            reverse("workspaces:business-discovery"), {"q": str(business.id)}
        )

        self.assertEqual(short_name_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            short_name_response.data["data"]["businesses"][0]["id"],
            str(business.id),
        )
        self.assertEqual(uuid_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            uuid_response.data["data"]["businesses"][0]["public_handle"], "kj"
        )

    def test_personal_workspace_rejects_access_requests(self):
        personal = create_business(
            user=self.owner,
            name="Private Space",
            workspace_type=Business.WorkspaceType.PERSONAL_BRAND,
        )
        self.authenticate(self.outsider)
        response = self.client.post(
            reverse("workspaces:access-request-create"),
            {"business_id": str(personal.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["errors"]["code"],
            "personal_workspace_membership_restricted",
        )

    def test_duplicate_access_request_returns_focused_conflict(self):
        business = create_business(user=self.owner, name="Request Target")
        self.authenticate(self.outsider)
        payload = {"business_id": str(business.id)}
        self.client.post(
            reverse("workspaces:access-request-create"), payload, format="json"
        )
        response = self.client.post(
            reverse("workspaces:access-request-create"), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["errors"]["code"], "access_request_already_pending"
        )

    def test_outsider_cannot_read_business_or_members(self):
        business = create_business(user=self.owner, name="Private Business")
        self.authenticate(self.outsider)
        detail = self.client.get(
            reverse("workspaces:business-detail", kwargs={"business_id": business.id})
        )
        members = self.client.get(
            reverse("workspaces:member-list", kwargs={"business_id": business.id})
        )
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(members.status_code, status.HTTP_404_NOT_FOUND)

    def test_workspace_overview_returns_live_role_and_state(self):
        business = create_business(user=self.owner, name="Overview Business")
        response = self.client.get(
            reverse(
                "workspaces:business-overview",
                kwargs={"business_id": business.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["business"]["id"], str(business.id))
        self.assertEqual(
            response.data["data"]["membership"]["role"], WorkspaceRole.OWNER
        )
        self.assertEqual(response.data["data"]["state"]["active_member_count"], 1)
        self.assertEqual(response.data["data"]["state"]["pending_action_count"], 0)
        self.assertEqual(
            response.data["data"]["state"]["profile_completion_percentage"], 33
        )

    def test_workspace_type_change_to_personal_brand_rejects_other_members(self):
        business = create_business(user=self.owner, name="Collaborative Business")
        BusinessMembership.objects.create(
            business=business,
            user=self.outsider,
            role=WorkspaceRole.MEMBER,
        )
        response = self.client.patch(
            reverse("workspaces:business-profile", kwargs={"business_id": business.id}),
            {"workspace_type": Business.WorkspaceType.PERSONAL_BRAND},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        business.refresh_from_db()
        self.assertEqual(business.workspace_type, Business.WorkspaceType.BUSINESS)

    def test_owner_can_manage_business_profile_and_brand(self):
        business = create_business(user=self.owner, name="Managed Business")
        response = self.client.patch(
            reverse("workspaces:business-profile", kwargs={"business_id": business.id}),
            {
                "country_code": "TZ",
                "business_category": "retail_commerce",
                "operating_model": "hybrid",
                "region": "Dar es Salaam",
                "city": "Dar es Salaam",
                "primary_brand_color": "#112233",
                "secondary_brand_color": "#EE7722",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["data"]["profile"]["primary_brand_color"], "#112233"
        )
        self.assertEqual(response.data["data"]["completion"]["percentage"], 100)

    def test_owner_can_upload_business_logo_and_list_returns_it(self):
        business = create_business(user=self.owner, name="Logo Business")
        content = BytesIO()
        Image.new("RGB", (16, 16), "navy").save(content, format="PNG")
        logo = SimpleUploadedFile(
            "logo.png", content.getvalue(), content_type="image/png"
        )
        with TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.patch(
                reverse(
                    "workspaces:business-profile", kwargs={"business_id": business.id}
                ),
                {"logo": logo},
                format="multipart",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn(
                "/media/businesses/", response.data["data"]["profile"]["logo_url"]
            )
            listed = self.client.get(reverse("workspaces:business-list"))
            listed_business = listed.data["data"]["businesses"][0]
            self.assertIn("/media/businesses/", listed_business["logo_url"])

    def test_member_can_read_but_not_edit_business_profile(self):
        business = create_business(user=self.owner, name="Visible Profile")
        BusinessMembership.objects.create(
            business=business,
            user=self.outsider,
            role=WorkspaceRole.MEMBER,
        )
        self.authenticate(self.outsider)
        url = reverse(
            "workspaces:business-profile", kwargs={"business_id": business.id}
        )
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        response = self.client.patch(
            url, {"business_category": "retail_commerce"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_update_workspace_settings(self):
        business = create_business(user=self.owner, name="Settings Business")
        response = self.client.patch(
            reverse(
                "workspaces:business-settings", kwargs={"business_id": business.id}
            ),
            {
                "is_discoverable": False,
                "language_code": "sw",
                "timezone": "Africa/Nairobi",
                "date_format": "YYYY-MM-DD",
                "time_format": "12h",
                "branding_enabled": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["data"]["settings"]["is_discoverable"])
        self.assertEqual(response.data["data"]["settings"]["language_code"], "sw")

    def test_security_state_returns_controllers_permissions_and_audit(self):
        business = create_business(user=self.owner, name="Secure Business")
        response = self.client.get(
            reverse("workspaces:business-security", kwargs={"business_id": business.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["controllers"]), 1)
        self.assertIn("business.control", response.data["data"]["permissions"])
        self.assertTrue(response.data["data"]["recent_events"])

    def test_public_handle_change_is_explicit_and_cooled_down(self):
        business = create_business(user=self.owner, name="Handle Business")
        url = reverse(
            "workspaces:business-profile", kwargs={"business_id": business.id}
        )
        first = self.client.patch(url, {"public_handle": "new-handle"}, format="json")
        second = self.client.patch(
            url, {"public_handle": "another-handle"}, format="json"
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            second.data["errors"]["code"], "business_handle_change_cooldown"
        )

    def test_workspace_overview_hides_management_counts_from_member(self):
        business = create_business(user=self.owner, name="Member Overview")
        membership = BusinessMembership.objects.create(
            business=business,
            user=self.outsider,
            role=WorkspaceRole.MEMBER,
        )
        self.authenticate(self.outsider)
        response = self.client.get(
            reverse(
                "workspaces:business-overview",
                kwargs={"business_id": business.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["membership"]["id"], str(membership.id))
        self.assertIsNone(response.data["data"]["state"]["pending_invitation_count"])
        self.assertIsNone(
            response.data["data"]["state"]["pending_access_request_count"]
        )
        self.assertIsNone(
            response.data["data"]["state"]["pending_control_request_count"]
        )

    def test_dashboard_access_request_can_be_approved_by_owner(self):
        business = create_business(user=self.owner, name="Requested Business")
        self.authenticate(self.outsider)
        requested = self.client.post(
            reverse("workspaces:access-request-create"),
            {"business_id": str(business.id), "message": "Please add me."},
            format="json",
        )
        self.assertEqual(requested.status_code, status.HTTP_201_CREATED)

        self.authenticate(self.owner)
        decided = self.client.post(
            reverse(
                "workspaces:access-request-decision",
                kwargs={
                    "business_id": business.id,
                    "request_id": requested.data["data"]["id"],
                },
            ),
            {"decision": "approve", "role": WorkspaceRole.MEMBER},
            format="json",
        )
        self.assertEqual(decided.status_code, status.HTTP_200_OK)
        self.assertTrue(
            BusinessMembership.objects.filter(
                business=business,
                user=self.outsider,
                role=WorkspaceRole.MEMBER,
            ).exists()
        )
