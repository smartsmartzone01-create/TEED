from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete

from .branding import KUZA_AI_ID, KUZA_AI_NAME
from .serializers import PartnerRequestSerializer
from .services import run_kuza_ai


class IntelligencePartnerAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = PartnerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = run_kuza_ai(
            user=request.user,
            business_id=business_id,
            message=serializer.validated_data["message"],
            requested_locale=serializer.validated_data.get("locale"),
        )

        return SuccessResponse(
            message=f"{KUZA_AI_NAME} response generated successfully.",
            data={
                "assistant": {
                    "id": KUZA_AI_ID,
                    "name": KUZA_AI_NAME,
                },
                "reply": result.reply,
                "locale": result.locale,
                "usage": result.usage,
            },
        )


__all__ = ["IntelligencePartnerAPIView"]
