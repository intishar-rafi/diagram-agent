import { tool } from "ai";
import { z } from "zod";

// Removes elements from the canvas by id. Same passthrough pattern as
// addElements: the worker just relays the ids, the browser does the delete.

export const removeElements = tool({
  description: `Remove elements from the canvas by id. Use this when the user wants to delete shapes. Ids must come from the canvas — call queryCanvas first if you don't know what's there.

Example: removeElements({ ids: ["rect_old", "arrow_stale"] })`,
  inputSchema: z.object({
    ids: z.array(z.string()).describe("Array of element ids to remove"),
  }),
  execute: async ({ ids }) => {
    return { ids };
  },
});
