from django.conf import settings

from .orchestration import AgentOrchestrator
from .providers import get_provider
from .tools import ToolRegistry


def build_agent(*, tools=None, provider_name=None):
    return AgentOrchestrator(
        provider=get_provider(provider_name),
        tools=tools or ToolRegistry(),
        max_tool_calls=settings.AI_MAX_TOOL_CALLS,
    )
