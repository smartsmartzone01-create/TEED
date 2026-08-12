from enum import StrEnum

from .models import Business


class WorkspaceCapability(StrEnum):
    SOCIAL_PRESENCE = "social_presence"
    AI_GUIDANCE = "ai_guidance"
    BUSINESS_OPERATIONS = "business_operations"
    SERVICE_OPERATIONS = "service_operations"
    PERSONAL_BRAND_TOOLS = "personal_brand_tools"
    TEAM_COLLABORATION = "team_collaboration"


WORKSPACE_TYPE_CAPABILITIES = {
    Business.WorkspaceType.BUSINESS: frozenset(
        {
            WorkspaceCapability.SOCIAL_PRESENCE,
            WorkspaceCapability.AI_GUIDANCE,
            WorkspaceCapability.BUSINESS_OPERATIONS,
            WorkspaceCapability.TEAM_COLLABORATION,
        }
    ),
    Business.WorkspaceType.SERVICE: frozenset(
        {
            WorkspaceCapability.SOCIAL_PRESENCE,
            WorkspaceCapability.AI_GUIDANCE,
            WorkspaceCapability.SERVICE_OPERATIONS,
            WorkspaceCapability.TEAM_COLLABORATION,
        }
    ),
    Business.WorkspaceType.PERSONAL_BRAND: frozenset(
        {
            WorkspaceCapability.SOCIAL_PRESENCE,
            WorkspaceCapability.AI_GUIDANCE,
            WorkspaceCapability.PERSONAL_BRAND_TOOLS,
        }
    ),
}


def capabilities_for_workspace_type(workspace_type):
    return WORKSPACE_TYPE_CAPABILITIES.get(workspace_type, frozenset())


def workspace_type_has_capability(workspace_type, capability):
    return capability in capabilities_for_workspace_type(workspace_type)
