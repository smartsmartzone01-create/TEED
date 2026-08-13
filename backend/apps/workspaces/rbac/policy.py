from enum import StrEnum


class WorkspaceRole(StrEnum):
    OWNER = "owner"
    PARTNER = "partner"
    ADMINISTRATOR = "administrator"
    MANAGER = "manager"
    MEMBER = "member"


class WorkspacePermission(StrEnum):
    ACCESS = "workspace.access"
    MANAGE_BUSINESS = "business.manage"
    MANAGE_MEMBERS = "members.manage"
    MANAGE_INVITATIONS = "invitations.manage"
    CONTROL_BUSINESS = "business.control"
    TRANSFER_OWNERSHIP = "business.transfer_ownership"
    VIEW_COMMERCE = "commerce.view"
    MANAGE_CATALOG = "commerce.catalog.manage"
    MANAGE_INVENTORY = "commerce.inventory.manage"
    RECORD_SALES = "commerce.sales.record"
    MANAGE_FINANCE = "commerce.finance.manage"


ROLE_PERMISSIONS = {
    WorkspaceRole.OWNER: frozenset(WorkspacePermission),
    WorkspaceRole.PARTNER: frozenset(
        permission
        for permission in WorkspacePermission
        if permission != WorkspacePermission.TRANSFER_OWNERSHIP
    ),
    WorkspaceRole.ADMINISTRATOR: frozenset(
        {
            WorkspacePermission.ACCESS,
            WorkspacePermission.MANAGE_BUSINESS,
            WorkspacePermission.MANAGE_MEMBERS,
            WorkspacePermission.MANAGE_INVITATIONS,
            WorkspacePermission.VIEW_COMMERCE,
            WorkspacePermission.MANAGE_CATALOG,
            WorkspacePermission.MANAGE_INVENTORY,
            WorkspacePermission.RECORD_SALES,
            WorkspacePermission.MANAGE_FINANCE,
        }
    ),
    WorkspaceRole.MANAGER: frozenset(
        {
            WorkspacePermission.ACCESS,
            WorkspacePermission.MANAGE_INVITATIONS,
            WorkspacePermission.VIEW_COMMERCE,
            WorkspacePermission.MANAGE_CATALOG,
            WorkspacePermission.MANAGE_INVENTORY,
            WorkspacePermission.RECORD_SALES,
        }
    ),
    WorkspaceRole.MEMBER: frozenset({WorkspacePermission.ACCESS}),
}

PROTECTED_ROLES = frozenset({WorkspaceRole.OWNER, WorkspaceRole.PARTNER})
ASSIGNABLE_ROLES = frozenset(
    {
        WorkspaceRole.PARTNER,
        WorkspaceRole.ADMINISTRATOR,
        WorkspaceRole.MANAGER,
        WorkspaceRole.MEMBER,
    }
)


def permissions_for_role(role):
    try:
        return ROLE_PERMISSIONS[WorkspaceRole(role)]
    except (KeyError, ValueError):
        return frozenset()


def role_has_permission(role, permission):
    return WorkspacePermission(permission) in permissions_for_role(role)
