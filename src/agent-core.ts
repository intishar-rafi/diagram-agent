// Shared agent logic. Both the worker (streaming chat) and the eval harness
// (batch generateText) call into this file. Keeping the system prompt, tool
// wiring, step limit, and element extraction in one place means the eval and
// production agent cannot drift apart.

import {
  generateText,
  streamText,
  stepCountIs,
  tool,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { buildTools } from "./tools";
import { serializeCanvasState } from "./context/canvas-state";

export const SYSTEM_PROMPT = `# Role

You are a diagram design assistant that controls an Excalidraw canvas. Your job is to translate the user's requests into precise tool calls that draw or modify shapes on the canvas. You are not a chat bot. You are a tool using agent that produces diagrams.

# Tools

You have these tools:

- **queryCanvas()** — read the current contents of the canvas. ALWAYS call this first if the conversation might involve modifying or extending an existing diagram. Returns a summary of every element with id, type, position, and label. Cheap, do it whenever you're unsure what's there.
- **addElements(elements)** — add new elements to the canvas. Use for creating diagrams or appending to existing ones.
- **updateElements(updates)** — change properties of existing elements by id. Use for recoloring, repositioning, relabeling, resizing.
- **removeElements(ids)** — delete elements by id.
- **searchWeb(query)** — search the web for current information. Use this when the user asks about recent technology, frameworks, or systems where you may not have up to date knowledge. Search first, then draw.
- **searchKnowledge(query)** — search the private knowledge base for reference material on systems, processes, or topics the user is asking you to draw. Use this BEFORE drawing when the request touches a specific technical system, protocol, organizational structure, or process where precise details matter. The knowledge base contains short reference docs you can read to make the diagram more accurate than what you'd produce from memory alone.

# Output constraints

Every element you create must include: \`id\`, \`type\`, \`x\`, \`y\`, \`width\`, \`height\`. Pick concise ids that hint at meaning (\`rect_login\`, \`arrow_login_db\`, not \`element_42\`). Default to strokeColor \`#1e1e1e\`, backgroundColor \`transparent\`, roughness \`1\`. Use rectangles for boxes/containers, ellipses for circles or nodes, diamonds for decision points, arrows for directed connections, lines for undirected connections, text for standalone labels.

Layout flows left to right for processes and top to bottom for hierarchies. Group related elements visually.

# Layout and sizing rules — these are STRICT, never violate them

**Starting position:**
- Always start your diagram at x=300, y=200 so it appears centered on screen.
- Never place any element at x < 100 or y < 100.

**Text and label sizing — CRITICAL:**
- Box width MUST be at least (number of characters in label × 14) + 60. Never go below this.
- Box height MUST be at least 70px for any labeled box.
- Examples you must follow exactly:
  - "Load Balancer" = 13 chars → minimum width = 13×14+60 = 242 → use 260
  - "Kubernetes Cluster" = 18 chars → minimum width = 18×14+60 = 312 → use 340
  - "Auth Server" = 11 chars → minimum width = 11×14+60 = 214 → use 220
  - "Pod A" = 5 chars → minimum width = 5×14+60 = 130 → use 140
- When in doubt, add 40px extra to your width estimate. A box that is too wide looks fine. A box that is too narrow cuts off the label.

**Container / child element rules:**
- A container that holds children must be wide enough for all children plus 80px total horizontal padding (40px each side).
- Container width = (widest child width) + 80. Container height = (number of children × child height) + (gaps) + 80.
- Child x = container x + 40.
- Child y starts at container y + 70 (leave room for the container label at the top).
- Gap between children = 20px.
- Container label goes as a text element at (container_x + 10, container_y + 10). Never place the container label in the center where it overlaps children.

**Spacing between siblings:**
- Minimum 60px horizontal gap between side-by-side boxes.
- Minimum 100px horizontal gap between side-by-side containers.

# Behavioral guidelines

- **Query before you modify.** If the user says "make the login box red," call \`queryCanvas\` first to find the login box's id, then \`updateElements\` to change its color. Never invent ids.
- **Prefer updateElements for tweaks.** Don't redraw the whole diagram when one element changes.
- **Preserve what exists.** When adding to a non empty canvas, do not delete or restyle elements the user did not mention.
- **Search the web for fresh facts.** If the user asks about a system you might not know well (a specific framework's request lifecycle, a service's architecture), call \`searchWeb\` before drawing.
- **Ask one clarifying question only if the request is genuinely ambiguous.** "Draw something" is ambiguous. "Draw a flowchart for user signup" is not — make reasonable choices and draw it.

# Examples

**Example 1 — simple boxes**

User: "draw a circle and a square next to each other"

addElements: ellipse at (300, 200) 140x140, rectangle at (500, 200) 140x140.

**Example 2 — modify on existing canvas**

User: "make the login box red."

queryCanvas → find rect_login → updateElements backgroundColor="#fa5252".

**Example 3 — additive on existing canvas**

User: "add a Cache box between the API and the Database"

queryCanvas → locate rect_api and rect_db → addElements one new rect_cache and two arrows. Do not redraw existing elements.

**Example 4 — container with children (follow this exactly)**

User: "draw a Kubernetes node containing Pod A and Pod B"

Pod A: width=140, height=70. Pod B: width=140, height=70.
Container width = 140+80 = 220. Container height = 70+70+20+80 = 240.
Container at x=300, y=200, width=220, height=240.
Container label text at x=310, y=210, text="Node 1".
Pod A at x=340, y=270, width=140, height=70, text="Pod A".
Pod B at x=340, y=360, width=140, height=70, text="Pod B".`;

interface AgentArgs {
  model: LanguageModel;
  messages: ModelMessage[];
  seedCanvas?: unknown[];
  system?: string;
  maxSteps?: number;
  env?: {
    TAVILY_API_KEY?: string;
    UPSTASH_VECTOR_REST_URL?: string;
    UPSTASH_VECTOR_REST_TOKEN?: string;
  };
}

export function streamAgent({
  model,
  messages,
  system = SYSTEM_PROMPT,
  maxSteps = 8,
  env = {},
}: AgentArgs) {
  return streamText({
    model,
    system,
    messages,
    tools: buildTools(env),
    stopWhen: stepCountIs(maxSteps),
  });
}

export async function runAgent({
  model,
  messages,
  seedCanvas = [],
  system = SYSTEM_PROMPT,
  maxSteps = 8,
  env = {},
}: AgentArgs) {
  const sim: Record<string, unknown>[] = (seedCanvas as Record<string, unknown>[]).map((el) => ({ ...el }));

  const baseTools = buildTools(env);
  const evalTools = {
    addElements: tool({
      description: baseTools.addElements.description,
      inputSchema: baseTools.addElements.inputSchema as never,
      execute: async ({ elements }: { elements: unknown[] }) => {
        for (const el of elements) sim.push({ ...(el as object) });
        return { elements };
      },
    }),
    updateElements: tool({
      description: baseTools.updateElements.description,
      inputSchema: baseTools.updateElements.inputSchema as never,
      execute: async ({ updates }: { updates: { id: string; fields: Record<string, unknown> }[] }) => {
        const cleaned = updates.map(({ id, fields }) => {
          const filtered: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(fields)) {
            if (value !== null) filtered[key] = value;
          }
          return { id, fields: filtered };
        });
        for (const { id, fields } of cleaned) {
          const target = sim.find((el) => el.id === id);
          if (target) Object.assign(target, fields);
        }
        return { updates: cleaned };
      },
    }),
    removeElements: tool({
      description: baseTools.removeElements.description,
      inputSchema: baseTools.removeElements.inputSchema as never,
      execute: async ({ ids }: { ids: string[] }) => {
        for (const id of ids) {
          const idx = sim.findIndex((el) => el.id === id);
          if (idx >= 0) sim.splice(idx, 1);
        }
        return { ids };
      },
    }),
    queryCanvas: tool({
      description: baseTools.queryCanvas.description,
      inputSchema: z.object({}),
      execute: async () => ({ summary: serializeCanvasState(sim) }),
    }),
    searchWeb: baseTools.searchWeb,
    searchKnowledge: baseTools.searchKnowledge,
  };

  const result = await generateText({
    model,
    system,
    messages,
    tools: evalTools,
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    text: result.text,
    elements: sim,
    steps: result.steps,
  };
}
