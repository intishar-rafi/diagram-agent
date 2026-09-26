// Helpers for turning a golden test case into the ModelMessage[] history that
// gets fed to the agent. Create cases are trivial (one user turn). Modify
// cases need a fake prior conversation: the original user request, the
// agent's tool call producing seed elements, the matching tool result, the
// agent's confirmation, then the new user turn that asks for a modification.
//
// The whole point is the agent should not be able to tell the difference
// between this fake history and a real session it lived through.

import type { ModelMessage } from "ai";

export interface SeedData {
  userPrompt: string;
  assistantConfirmation: string;
  elements: unknown[];
}

export type Difficulty = "simple" | "medium" | "hard" | "edge";
export type Category = "create" | "modify" | "domain" | "edge";

export interface GoldenTestCase {
  id: string;
  input: string;
  seed?: SeedData;
  expectedCharacteristics: string[];
  expectedKeywords?: string[];
  preservedIds?: string[];
  difficulty: Difficulty;
  category: Category;
}

// Always returns a single user turn. The seed elements (if any) are passed
// separately as `canvasState` to runAgent — that's how the agent learns
// what's already on the canvas in lesson 6+. We used to mock a fake tool
// history here, but that workaround is gone now that canvas state is a
// first class arg to the agent core.
export function buildMessages(tc: GoldenTestCase): ModelMessage[] {
  return [{ role: "user", content: tc.input }];
}
