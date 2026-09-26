// Chat history compaction. When the conversation gets long enough that
// throwing it all at the model would blow the context window (or just waste
// a lot of tokens on irrelevant history), we summarize the older portion
// and replace it with a single system message containing the summary.
//
// Pure function: does not mutate the input array.
//
// Heuristic: total character count > threshold (default 32k chars, roughly
// 8k tokens). When triggered, summarize all messages except the last 4 so
// the immediate conversation flow stays intact.

import { generateText, type LanguageModel, type ModelMessage } from "ai";

interface CompactOptions {
  threshold?: number;
  keepLast?: number;
  model: LanguageModel;
}

const DEFAULT_THRESHOLD = 32_000;
const DEFAULT_KEEP_LAST = 4;

function characterCount(messages: ModelMessage[]): number {
  let total = 0;
  for (const m of messages) {
    if (typeof m.content === "string") {
      total += m.content.length;
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (typeof part === "object" && part && "text" in part && typeof part.text === "string") {
          total += part.text.length;
        }
      }
    }
  }
  return total;
}

function messageToText(m: ModelMessage): string {
  const role = m.role.toUpperCase();
  if (typeof m.content === "string") return `${role}: ${m.content}`;
  if (Array.isArray(m.content)) {
    const parts = m.content
      .map((part) => {
        if (typeof part !== "object" || !part) return "";
        if ("text" in part && typeof part.text === "string") return part.text;
        if ("toolName" in part) return `[tool call: ${part.toolName}]`;
        return "";
      })
      .filter(Boolean)
      .join(" ");
    return `${role}: ${parts}`;
  }
  return `${role}:`;
}

export async function compactHistory(
  messages: ModelMessage[],
  options: CompactOptions
): Promise<ModelMessage[]> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const keepLast = options.keepLast ?? DEFAULT_KEEP_LAST;

  if (characterCount(messages) < threshold) {
    return messages.slice();
  }

  if (messages.length <= keepLast) {
    return messages.slice();
  }

  const olderMessages = messages.slice(0, messages.length - keepLast);
  const recentMessages = messages.slice(messages.length - keepLast);

  const transcript = olderMessages.map(messageToText).join("\n");

  const summary = await generateText({
    model: options.model,
    system:
      "You compress conversation history into terse summaries that preserve every decision the user made and every diagram element the assistant created. Keep element ids verbatim. Output a single paragraph, no preamble.",
    prompt: `Summarize this conversation:\n\n${transcript}`,
  });

  const summaryMessage: ModelMessage = {
    role: "system",
    content: `Summary of earlier conversation: ${summary.text}`,
  };

  return [summaryMessage, ...recentMessages];
}
