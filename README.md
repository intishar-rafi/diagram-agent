# SketchMind AI

An AI-powered diagramming agent that draws on an Excalidraw canvas from natural language — powered by Cloudflare Workers, OpenAI, and RAG.

---

## Demo

![demo](demo.gif)

---

## How It Works

```mermaid
flowchart TD
    User["User prompt"]
    Agent["Cloudflare Worker\nAIChatAgent"]
    OpenAI["OpenAI GPT-4o"]

    searchKnowledge["searchKnowledge()\nUpstash Vector RAG"]
    searchWeb["searchWeb()\nTavily API"]
    queryCanvas["queryCanvas()\nread canvas state"]
    addElements["addElements()"]
    updateElements["updateElements()"]
    removeElements["removeElements()"]

    Canvas["Excalidraw Canvas"]

    User --> Agent
    Agent --> OpenAI
    OpenAI --> searchKnowledge
    OpenAI --> searchWeb
    OpenAI --> queryCanvas
    OpenAI --> addElements
    OpenAI --> updateElements
    OpenAI --> removeElements

    queryCanvas -->|"current elements"| Agent
    addElements --> Canvas
    updateElements --> Canvas
    removeElements --> Canvas
```

---

## Stack

- **Frontend** — React + Excalidraw
- **Agent** — Cloudflare Workers + AIChatAgent
- **LLM** — OpenAI GPT-4o via AI SDK
- **Knowledge base** — Upstash Vector
- **Web search** — Tavily
- **Evals** — Braintrust

---

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/sketchmind-ai
cd sketchmind-ai
npm install
```

Create `.dev.vars`:

```
OPENAI_API_KEY=sk-...
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...
TAVILY_API_KEY=tvly-...
```

Seed the knowledge base:

```bash
npm run embed
```

Run locally:

```bash
npm run dev
```

---

## Example Prompts

- `Draw how JWT authentication works step by step`
- `Draw a web app with a frontend, backend, and database`
- `Draw a microservices setup with an API gateway and 3 services`
- `Make the login box red`
- `Add a cache between the API and the database`

---

## Knowledge Base

The agent has a built-in RAG knowledge base (seeded via `npm run embed`) that gives it accurate reference material before drawing. Covered topics:

| Topic | What it teaches the agent |
|---|---|
| Cloudflare Workers request lifecycle | Edge POP → isolate → Durable Object → KV/R2 → response |
| Kubernetes pod networking | External LB → Ingress → kube-proxy → CNI → pod |
| OAuth 2.0 Authorization Code + PKCE | Full redirect flow with verifier/challenge, token exchange |
| PostgreSQL write path | Backend → shared buffers → WAL → background writer → checkpoint |
| Startup org structure | Seed / Series A / Series B reporting hierarchies |
| General diagram best practices | Layout, labeling, color, shape selection rules |

When you ask it to draw any of these systems, it looks up the reference doc first and produces a structurally accurate diagram rather than guessing from memory.

---

