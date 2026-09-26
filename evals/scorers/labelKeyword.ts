// Label keyword scorer: for cases that declare expectedKeywords, check how
// many of those keywords appear (case insensitive) anywhere in the agent's
// text response or in any element's text/label fields. This is the deterministic
// stand-in for "did the agent use the right vocabulary".
//
// Cases without expectedKeywords return null so they don't count toward this
// metric. That keeps the score meaningful for the categories that need it
// (domain knowledge, structure-with-named-parts) without polluting the rest.
//
// Lifted by:
//   - lesson 6 (better system prompt makes the agent label things properly)
//   - lesson 8 (RAG gives the agent the right canonical terms for domain cases)

import type { EvalScorer } from "braintrust";
import type { AgentOutput } from "./schema";
import type { GoldenTestCase } from "../buildMessages";

const TEXT_FIELDS = ["text", "label"] as const;

function collectText(output: AgentOutput): string {
  const parts: string[] = [output.text ?? ""];
  for (const el of output.elements) {
    if (!el || typeof el !== "object") continue;
    const e = el as Record<string, unknown>;
    for (const field of TEXT_FIELDS) {
      const v = e[field];
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join(" ").toLowerCase();
}

export const labelKeywordScorer: EvalScorer<
  GoldenTestCase,
  AgentOutput,
  GoldenTestCase
> = ({ output, expected }) => {
  const keywords = expected?.expectedKeywords;
  if (!keywords || keywords.length === 0) {
    return null;
  }

  const haystack = collectText(output);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  return {
    name: "LabelKeywords",
    score: matched.length / keywords.length,
    metadata: { matched, missing, total: keywords.length },
  };
};
