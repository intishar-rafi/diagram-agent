import { z } from "zod";

// Shared element schema. Both addElements and updateElements use this shape
// (updateElements via a partial / nullable variant). Keeping it in one place
// means the agent sees the same field names whether it's creating new shapes
// or editing existing ones.

export const elementSchema = z.object({
  id: z.string().describe("Unique identifier. Pick concise ids that hint at meaning, like 'rect_login' or 'arrow_login_db'."),
  type: z.enum(["rectangle", "ellipse", "diamond", "text", "arrow", "line"]),
  x: z.number().describe("X position in pixels"),
  y: z.number().describe("Y position in pixels"),
  width: z.number().describe("Width in pixels"),
  height: z.number().describe("Height in pixels"),
  strokeColor: z.string().default("#1e1e1e").describe("Stroke color (hex)"),
  backgroundColor: z.string().default("transparent").describe("Fill color"),
  fillStyle: z.enum(["solid", "hachure", "cross-hatch"]).default("solid"),
  strokeWidth: z.number().default(2),
  roughness: z.number().default(1).describe("0 for clean, 1 for sketchy"),
  opacity: z.number().default(100),
  text: z.string().optional().describe("Text content (for text elements or labels)"),
  fontSize: z.number().default(20),
  fontFamily: z.number().default(1).describe("1=Virgil, 2=Helvetica, 3=Cascadia"),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  points: z
    .array(z.array(z.number()))
    .optional()
    .describe("Array of [x,y] points for arrow/line elements"),
  startBinding: z
    .object({
      elementId: z.string(),
      focus: z.number(),
      gap: z.number(),
    })
    .optional()
    .describe("Bind arrow start to an element"),
  endBinding: z
    .object({
      elementId: z.string(),
      focus: z.number(),
      gap: z.number(),
    })
    .optional()
    .describe("Bind arrow end to an element"),
});

export type ElementInput = z.infer<typeof elementSchema>;
