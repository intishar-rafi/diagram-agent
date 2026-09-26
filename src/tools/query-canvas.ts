import { tool } from "ai";
import { z } from "zod";

// queryCanvas is a CLIENT SIDE tool. Notice there's no `execute` function.
//
// When the agent calls this tool, the AI SDK doesn't run anything on the
// worker. Instead, the tool call gets streamed to the browser as part of the
// assistant message, and useAgentChat's onToolCall handler in App.tsx fulfills
// it by reading the live Excalidraw scene and submitting a tool result back.
// The agent loop then resumes with that result in context.
//
// Why this is better than the lesson 6 data-canvas-state hack:
// - Lazy: the agent only fetches state when it actually needs it, not on
//   every turn
// - Round-trip is part of the protocol the AI SDK already understands, no
//   custom message parts
// - The browser is the source of truth, no risk of stale state

export const queryCanvas = tool({
  description: `Read the current contents of the canvas. Call this when you need to know what elements already exist before adding, modifying, or removing anything. Returns a summary of every element with its id, type, position, and label.

Example: queryCanvas({})`,
  inputSchema: z.object({}),
  // No execute. The browser handles it.
});
