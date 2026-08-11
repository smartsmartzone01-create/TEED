"""Compatibility exports; new code imports the RBAC policy directly."""

from .rbac.policy import (
    ASSIGNABLE_ROLES,
    PROTECTED_ROLES,
    ROLE_PERMISSIONS,
    WorkspacePermission,
    WorkspaceRole,
    permissions_for_role,
    role_has_permission,
)

__all__ = [
    "ASSIGNABLE_ROLES",
    "PROTECTED_ROLES",
    "ROLE_PERMISSIONS",
    "WorkspacePermission",
    "WorkspaceRole",
    "permissions_for_role",
    "role_has_permission",
]
