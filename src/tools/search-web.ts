import { tool } from "ai";
import { z } from "zod";

// searchWeb calls the Tavily API for fresh information from the web. This is
// the lesson 7 demonstration of "tool execute can call an external API."
//
// We don't use a Tavily SDK — just fetch. The model gives us a query, we
// post it, we condense the response into the small shape the model actually
// needs ({title, content, url}), and return it. Errors are caught and
// returned as `{ error }` so the model can reason about the failure instead
// of crashing the agent loop.
//
// Three reasons web search lives here vs context (lesson 6) vs RAG (lesson 8):
// - Context: facts you ALWAYS want the model to see (system prompt, canvas
//   state). Cheap, but bloats every request.
// - Tools (this lesson): facts you fetch ON DEMAND when the model decides it
//   needs them. The model controls the trigger.
// - RAG (lesson 8): facts retrieved from YOUR OWN corpus via embeddings.
//   Same on demand pattern, different data source.
// Web search is the simplest version of "model decides to fetch external data."

interface TavilyResult {
  title?: string;
  content?: string;
  url?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

export function makeSearchWeb(apiKey: string | undefined) {
  return tool({
    description: `Search the web for current information. Use this when the user asks about recent technology, frameworks, services, or systems where you may not have up to date knowledge — for example "draw an architecture diagram of how Cloudflare Workers handle requests" should trigger a search before you start drawing.

Example: searchWeb({ query: "how Cloudflare Workers handle incoming requests", maxResults: 5 })`,
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z.number().optional().describe("How many results to return (default 5)"),
    }),
    execute: async ({ query, maxResults }) => {
      if (!apiKey) {
        return { error: "Tavily API key is not configured" };
      }
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: maxResults ?? 5,
            search_depth: "basic",
          }),
        });
        if (!response.ok) {
          return { error: `Tavily returned ${response.status}: ${await response.text()}` };
        }
        const data = (await response.json()) as TavilyResponse;
        const results = (data.results ?? []).map((r) => ({
          title: r.title ?? "",
          content: r.content ?? "",
          url: r.url ?? "",
        }));
        return { results };
      } catch (err) {
        return { error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  });
}
