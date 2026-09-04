class IntelligenceError(Exception):
    """Base exception for the Tunakuza Intelligence domain."""


class IntelligenceDisabledError(IntelligenceError):
    pass


class IntelligenceConfigurationError(IntelligenceError):
    pass


class ProviderRequestError(IntelligenceError):
    pass


class UnknownToolError(IntelligenceError):
    pass


class ToolCallLimitExceeded(IntelligenceError):
    pass
