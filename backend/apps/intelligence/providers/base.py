from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ProviderResponse:
    message: dict[str, Any]
    content: str = ""
    tool_calls: tuple[ToolCall, ...] = ()
    usage: dict[str, int] = field(default_factory=dict)


class IntelligenceProvider(ABC):
    @abstractmethod
    def generate(self, *, messages, tools=()):
        """Return one model turn without executing application tools."""
        raise NotImplementedError
