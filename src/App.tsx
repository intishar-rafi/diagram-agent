import { useState, useCallback, useEffect, useRef } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
  newElementWith,
} from "@excalidraw/excalidraw";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import Canvas from "./components/Canvas";
import ChatPanel from "./components/chat/ChatPanel";
import { serializeCanvasState } from "./context/canvas-state";
import "./App.css";

const sessionId = crypto.randomUUID();

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const appliedToolCalls = useRef<Set<string>>(new Set());

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  const agent = useAgent({ agent: "design-agent", name: sessionId });

  const { messages, sendMessage, status } = useAgentChat({
    agent,
    onToolCall: async ({ toolCall, addToolOutput }) => {
      if (toolCall.toolName !== "queryCanvas") return;
      const api = excalidrawAPIRef.current;
      const elements = api?.getSceneElements() ?? [];
      addToolOutput({
        toolCallId: toolCall.toolCallId,
        output: { summary: serializeCanvasState(elements as unknown[]) },
      });
    },
  });

  useEffect(() => {
    if (!excalidrawAPI) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts ?? []) {
        const type = (part as { type?: string }).type;
        if (
          type !== "tool-addElements" &&
          type !== "tool-updateElements" &&
          type !== "tool-removeElements"
        ) {
          continue;
        }
        const p = part as {
          type: string;
          toolCallId: string;
          state: string;
          output: unknown;
        };
        if (p.state !== "output-available") continue;
        if (appliedToolCalls.current.has(p.toolCallId)) continue;
        appliedToolCalls.current.add(p.toolCallId);

        if (p.type === "tool-addElements") {
          const output = p.output as { elements?: unknown };
          const skeletons = output?.elements;
          if (Array.isArray(skeletons) && skeletons.length > 0) {
            const mapped = skeletons.map((el: Record<string, unknown>) => {
              const { text, ...rest } = el;
              if (
                text &&
                rest.type !== "text" &&
                rest.type !== "arrow" &&
                rest.type !== "line"
              ) {
                return { ...rest, label: { text } };
              }
              return el;
            });
            const newOnes = convertToExcalidrawElements(mapped as never, {
              regenerateIds: false,
            });
            const current = excalidrawAPI.getSceneElements();
            const next = [...current, ...newOnes];
            excalidrawAPI.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            excalidrawAPI.scrollToContent(next, { fitToContent: true });
          }
        } else if (p.type === "tool-updateElements") {
          const output = p.output as {
            updates?: { id: string; fields: Record<string, unknown> }[];
          };
          const updates = output?.updates;
          if (Array.isArray(updates) && updates.length > 0) {
            const byId = new Map(updates.map((u) => [u.id, u.fields]));
            const current = excalidrawAPI.getSceneElements();
            const next = current.map((el) => {
              const fields = byId.get(el.id);
              return fields ? newElementWith(el, fields as never) : el;
            });
            excalidrawAPI.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        } else if (p.type === "tool-removeElements") {
          const output = p.output as { ids?: string[] };
          const ids = new Set(output?.ids ?? []);
          if (ids.size > 0) {
            const current = excalidrawAPI.getSceneElements();
            const next = current.filter((el) => !ids.has(el.id));
            excalidrawAPI.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        }
      }
    }
  }, [messages, excalidrawAPI]);

  return (
    <div className={`app ${theme}`}>
      <div className="canvas-container">
        <Canvas onApiReady={handleApiReady} onThemeChange={setTheme} />
      </div>
      <ChatPanel
        messages={messages}
        sendMessage={sendMessage}
        status={status}
      />
      <a href="#viewer" className="viewer-launch" title="Open diagram viewer for human scoring">
        viewer
      </a>
    </div>
  );
}
