from common.responses import SuccessResponse
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.commerce.services import commerce_membership
from apps.profiles.permissions import IsOnboardingComplete

from .selectors import SEARCH_SCOPES, workspace_search


class WorkspaceSearchAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]

    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
        )
        scope = str(request.query_params.get("scope", "all") or "all").strip().lower()
        if scope not in SEARCH_SCOPES:
            raise ValidationError(
                {"scope": ["Choose all, available_products, or stock."]}
            )

        raw_limit = request.query_params.get("limit", 8)
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError) as error:
            raise ValidationError({"limit": ["Enter a whole number."]}) from error
        if limit < 1:
            raise ValidationError({"limit": ["Enter a number greater than zero."]})

        data = workspace_search(
            business=membership.business,
            query=request.query_params.get("q", ""),
            scope=scope,
            limit=limit,
        )
        return SuccessResponse(
            message="Workspace search completed successfully.",
            data=data,
        )


__all__ = ["WorkspaceSearchAPIView"]
