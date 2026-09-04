type KuzaAIMode = "closed" | "panel" | "expanded";
type KuzaAIMessageRole = "assistant" | "user";

type KuzaAIMessage = {
  content: string;
  id: string;
  role: KuzaAIMessageRole;
};

export type { KuzaAIMessage, KuzaAIMessageRole, KuzaAIMode };
