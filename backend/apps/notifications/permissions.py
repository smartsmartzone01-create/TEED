from rest_framework.permissions import BasePermission


class IsOnboardingComplete(BasePermission):
    message = "Complete onboarding before accessing notifications."
    code = "onboarding_required"

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_onboarding_complete
        )
