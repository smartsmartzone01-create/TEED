from common.exceptions.base import TEEDException
from rest_framework import status


class IntelligenceError(TEEDException):
    """Base exception for the Tunakuza Intelligence domain."""


class IntelligenceDisabledError(IntelligenceError):
    default_message = "Tunakuza Intelligence is currently disabled."
    default_code = "intelligence_disabled"
    default_status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class IntelligenceConfigurationError(IntelligenceError):
    default_message = "Tunakuza Intelligence is not configured."
    default_code = "intelligence_configuration_error"
    default_status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class ProviderRequestError(IntelligenceError):
    default_message = "The intelligence provider request failed."
    default_code = "intelligence_provider_failed"
    default_status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class UnknownToolError(IntelligenceError):
    default_message = "The intelligence provider requested an unknown tool."
    default_code = "intelligence_unknown_tool"
    default_status_code = status.HTTP_502_BAD_GATEWAY


class InvalidToolArgumentsError(IntelligenceError):
    default_message = "The intelligence provider supplied invalid tool arguments."
    default_code = "intelligence_invalid_tool_arguments"
    default_status_code = status.HTTP_502_BAD_GATEWAY


class ToolCallLimitExceeded(IntelligenceError):
    default_message = "The intelligence tool-call limit was exceeded."
    default_code = "intelligence_tool_limit_exceeded"
    default_status_code = status.HTTP_502_BAD_GATEWAY
