from django.test import SimpleTestCase

from ..policy import WorkspacePermission, WorkspaceRole, permissions_for_role


class WorkspacePolicyTests(SimpleTestCase):
    def test_fixed_roles_have_backend_owned_permissions(self):
        self.assertEqual(
            permissions_for_role(WorkspaceRole.MEMBER),
            {WorkspacePermission.ACCESS},
        )
        self.assertIn(
            WorkspacePermission.CONTROL_BUSINESS,
            permissions_for_role(WorkspaceRole.PARTNER),
        )
        self.assertNotIn(
            WorkspacePermission.CONTROL_BUSINESS,
            permissions_for_role(WorkspaceRole.ADMINISTRATOR),
        )

    def test_unknown_role_has_no_permissions(self):
        self.assertEqual(permissions_for_role("custom-role"), frozenset())
