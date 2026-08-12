from rest_framework import status

from ..base import TEEDException


class WorkspaceBusinessNotFound(TEEDException):
    default_message = "This Business could not be found or is not available."
    default_code = "business_not_found"
    default_status_code = status.HTTP_404_NOT_FOUND


class WorkspaceMembershipExists(TEEDException):
    default_message = "You already belong to this Business. Open its workspace instead."
    default_code = "business_membership_exists"
    default_status_code = status.HTTP_409_CONFLICT


class WorkspaceAccessRequestPending(TEEDException):
    default_message = "You have already requested access to this Business."
    default_code = "access_request_already_pending"
    default_status_code = status.HTTP_409_CONFLICT


class WorkspaceAccessRequestCooldown(TEEDException):
    default_message = (
        "Your recent request to this Business was declined. Try again later or contact "
        "the Business."
    )
    default_code = "access_request_recently_rejected"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class PersonalWorkspaceMembershipRestricted(TEEDException):
    default_message = "Personal workspaces do not accept members or access requests."
    default_code = "personal_workspace_membership_restricted"
    default_status_code = status.HTTP_409_CONFLICT


class WorkspaceHandleChangeCooldown(TEEDException):
    default_message = (
        "The public handle was changed recently. Try again after the cooldown."
    )
    default_code = "business_handle_change_cooldown"
    default_status_code = status.HTTP_409_CONFLICT


class WorkspaceHandleUnavailable(TEEDException):
    default_message = "This public handle is already in use."
    default_code = "business_handle_unavailable"
    default_status_code = status.HTTP_409_CONFLICT
