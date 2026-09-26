export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "complete" | "error";
  args?: Record<string, unknown>;
  result?: unknown;
}
