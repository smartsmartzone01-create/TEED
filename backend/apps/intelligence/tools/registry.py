from dataclasses import dataclass
from typing import Any, Callable

from ..exceptions import UnknownToolError


@dataclass(frozen=True)
class AgentTool:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[..., Any]

    def definition(self):
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


class ToolRegistry:
    def __init__(self, tools=()):
        self._tools = {}
        for tool in tools:
            self.register(tool)

    def register(self, tool):
        if tool.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.name}")
        self._tools[tool.name] = tool

    def definitions(self):
        return tuple(tool.definition() for tool in self._tools.values())

    def execute(self, name, arguments):
        try:
            tool = self._tools[name]
        except KeyError as exc:
            raise UnknownToolError(f"Unknown intelligence tool: {name}") from exc
        return tool.handler(**arguments)
