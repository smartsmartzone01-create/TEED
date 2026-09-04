from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.commerce.services import commerce_membership
from apps.profiles.permissions import IsOnboardingComplete

from .context import build_intelligence_context
from .prompts import build_partner_system_prompt
from .serializers import PartnerRequestSerializer
from .services import build_agent
from .tools import build_commerce_tool_registry


class IntelligencePartnerAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = PartnerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
        )
        context = build_intelligence_context(
            membership=membership,
            requested_locale=serializer.validated_data.get("locale"),
        )
        tools = build_commerce_tool_registry(
            membership=membership,
            context=context,
        )
        result = build_agent(tools=tools).run(
            messages=[
                {
                    "role": "system",
                    "content": build_partner_system_prompt(context),
                },
                {
                    "role": "user",
                    "content": serializer.validated_data["message"],
                },
            ]
        )

        return SuccessResponse(
            message="Tunakuza Partner response generated successfully.",
            data={
                "reply": result.content,
                "locale": context.locale,
                "usage": result.usage,
            },
        )


__all__ = ["IntelligencePartnerAPIView"]
