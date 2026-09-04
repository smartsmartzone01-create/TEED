from dataclasses import dataclass

from django.conf import settings

from apps.commerce.services import commerce_membership

from .context import build_intelligence_context
from .orchestration import AgentOrchestrator
from .prompts import build_partner_system_prompt
from .providers import get_provider
from .tools import ToolRegistry, build_commerce_tool_registry


@dataclass(frozen=True)
class KuzaAIResult:
    reply: str
    locale: str
    usage: dict[str, int]


def build_agent(*, tools=None, provider_name=None):
    return AgentOrchestrator(
        provider=get_provider(provider_name),
        tools=tools or ToolRegistry(),
        max_tool_calls=settings.AI_MAX_TOOL_CALLS,
    )


def run_kuza_ai(
    *,
    user,
    business_id,
    message,
    requested_locale=None,
    provider_name=None,
):
    membership = commerce_membership(
        user=user,
        business_id=business_id,
    )
    context = build_intelligence_context(
        membership=membership,
        requested_locale=requested_locale,
    )
    tools = build_commerce_tool_registry(
        membership=membership,
        context=context,
    )
    result = build_agent(
        tools=tools,
        provider_name=provider_name,
    ).run(
        messages=[
            {
                "role": "system",
                "content": build_partner_system_prompt(context),
            },
            {
                "role": "user",
                "content": message,
            },
        ]
    )
    return KuzaAIResult(
        reply=result.content,
        locale=context.locale,
        usage=result.usage,
    )
