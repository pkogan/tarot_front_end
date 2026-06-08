"use client";

import { useMemo, useState } from "react";
import { MarkdownViewer } from "./MarkdownViewer";
import { JsonViewer } from "./JsonViewer";

type Props = { text: string };

type ToolResponse = { text: string; isError: boolean };

type Step =
  | { kind: "user"; text: string; turn: number }
  | { kind: "assistant"; text: string; turn: number }
  | { kind: "thinking"; text: string; turn: number }
  | {
      kind: "toolCall";
      name: string;
      args: unknown;
      callId?: string;
      response?: ToolResponse;
      turn: number;
    }
  | { kind: "response"; text: string; turn: number };

export function TrajectoryViewer({ text }: Props) {
  const parsed = useMemo(() => parseTrajectory(text), [text]);

  if (!parsed.ok) {
    return <JsonViewer text={text} />;
  }

  const { steps, totalTurns } = parsed;

  if (steps.length === 0) {
    return (
      <div className="text-ink-500 text-sm">
        No conversational content in this trajectory.
      </div>
    );
  }

  const counts = countSteps(steps);

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-ink-500 font-mono">
        {totalTurns} turn{totalTurns === 1 ? "" : "s"}
        {" • "}
        {counts.user} user
        {" / "}
        {counts.assistant} assistant
        {" / "}
        {counts.thinking} thinking
        {" / "}
        {counts.toolCall} tool calls
        {" / "}
        {counts.response} response
      </div>
      {steps.map((step, i) => (
        <StepRow key={i} step={step} />
      ))}
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  switch (step.kind) {
    case "user":
      return (
        <BubbleCard label="User" tone="user" turnNumber={step.turn}>
          <MarkdownViewer text={step.text} />
        </BubbleCard>
      );
    case "assistant":
      return (
        <BubbleCard label="Assistant" tone="assistant" turnNumber={step.turn}>
          <MarkdownViewer text={step.text} />
        </BubbleCard>
      );
    case "thinking":
      return (
        <BubbleCard label="Thinking" tone="thinking" turnNumber={step.turn}>
          <MarkdownViewer text={step.text} />
        </BubbleCard>
      );
    case "toolCall":
      return (
        <ToolCallCard
          name={step.name}
          args={step.args}
          callId={step.callId}
          response={step.response}
          turnNumber={step.turn}
        />
      );
    case "response":
      return (
        <BubbleCard label="Response" tone="response" turnNumber={step.turn}>
          <MarkdownViewer text={step.text} />
        </BubbleCard>
      );
  }
}

type Tone = "user" | "assistant" | "thinking" | "response";

function BubbleCard({
  label,
  tone,
  turnNumber,
  children,
}: {
  label: string;
  tone: Tone;
  turnNumber?: number;
  children: React.ReactNode;
}) {
  const box: Record<Tone, string> = {
    user: "border-sky-500/30 bg-sky-500/5",
    assistant: "border-ink-800 bg-ink-900/40",
    thinking: "border-violet-500/30 bg-violet-500/5",
    response: "border-emerald-500/40 bg-emerald-500/10",
  };
  const accent: Record<Tone, string> = {
    user: "text-sky-700 dark:text-sky-300",
    assistant: "text-ink-300",
    thinking: "text-violet-700 dark:text-violet-300",
    response: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={`rounded-lg border ${box[tone]} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {turnNumber !== undefined && <TurnBadge n={turnNumber} />}
        <div
          className={`text-[11px] uppercase tracking-wide font-mono ${accent[tone]}`}
        >
          {label}
        </div>
      </div>
      <div className={`text-sm ${tone === "thinking" ? "italic" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function TurnBadge({ n }: { n: number }) {
  return (
    <span
      title={`Turn ${n}`}
      className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-ink-800 text-ink-200 text-[10px] font-mono font-semibold"
    >
      {n}
    </span>
  );
}

function ToolCallCard({
  name,
  args,
  callId,
  response,
  turnNumber,
}: {
  name: string;
  args: unknown;
  callId?: string;
  response?: ToolResponse;
  turnNumber?: number;
}) {
  const [open, setOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const argsJson = useMemo(() => safeStringify(args), [args]);
  const preview = useMemo(() => buildPreview(args), [args]);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        {turnNumber !== undefined && <TurnBadge n={turnNumber} />}
        <span className="text-[11px] uppercase tracking-wide font-mono text-amber-700 dark:text-amber-300">
          Tool Call
        </span>
        {callId && (
          <span className="text-[10px] font-mono text-ink-600 truncate">
            {callId}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-baseline gap-2 group"
      >
        <span className="text-amber-800 dark:text-amber-200/90 text-[10px] font-mono">
          {open ? "▾" : "▸"}
        </span>
        <span className="font-mono text-sm text-ink-100">{name}</span>
        {!open && preview && (
          <span className="font-mono text-xs text-ink-500 truncate">
            ({preview})
          </span>
        )}
      </button>
      {open && (
        <pre className="mt-2 text-[12px] font-mono bg-ink-950/40 border border-ink-800 rounded p-2 overflow-x-auto scroll-thin whitespace-pre-wrap break-words">
          {argsJson}
        </pre>
      )}
      {response && (
        <ToolResponseBlock
          response={response}
          open={responseOpen}
          onToggle={() => setResponseOpen((o) => !o)}
        />
      )}
    </div>
  );
}

function ToolResponseBlock({
  response,
  open,
  onToggle,
}: {
  response: ToolResponse;
  open: boolean;
  onToggle: () => void;
}) {
  const { text, isError } = response;
  const preview = useMemo(() => buildResponsePreview(text), [text]);
  const labelClass = isError
    ? "text-red-700 dark:text-red-300"
    : "text-emerald-700 dark:text-emerald-300";
  const borderClass = isError
    ? "border-red-500/30 bg-red-500/5"
    : "border-emerald-500/30 bg-emerald-500/5";

  return (
    <div className={`mt-3 ml-3 rounded-md border ${borderClass} p-3`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-baseline gap-2 group"
      >
        <span className="text-[10px] font-mono text-ink-500">
          {open ? "▾" : "▸"}
        </span>
        <span
          className={`text-[11px] uppercase tracking-wide font-mono ${labelClass}`}
        >
          {isError ? "Error Response" : "Response"}
        </span>
        {!open && preview && (
          <span className="font-mono text-xs text-ink-500 truncate">
            {preview}
          </span>
        )}
      </button>
      {open && (
        <pre className="mt-2 text-[12px] font-mono bg-ink-950/40 border border-ink-800 rounded p-2 overflow-x-auto scroll-thin whitespace-pre-wrap break-words">
          {text}
        </pre>
      )}
    </div>
  );
}

function buildResponsePreview(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= 140) return flat;
  return flat.slice(0, 137) + "…";
}

function buildPreview(args: unknown): string {
  if (!args || typeof args !== "object" || Array.isArray(args)) return "";
  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return "";
  const flat = entries
    .map(([k, v]) => {
      let s: string;
      if (typeof v === "string") s = v;
      else if (v === null || v === undefined) s = String(v);
      else s = JSON.stringify(v);
      s = s.replace(/\s+/g, " ").trim();
      if (s.length > 60) s = s.slice(0, 57) + "…";
      return `${k}: ${s}`;
    })
    .join(", ");
  return flat.length > 140 ? flat.slice(0, 137) + "…" : flat;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function countSteps(steps: Step[]) {
  return steps.reduce(
    (acc, s) => {
      acc[s.kind] += 1;
      return acc;
    },
    { user: 0, assistant: 0, thinking: 0, toolCall: 0, response: 0 },
  );
}

function parseTrajectory(
  text: string,
): { ok: false } | { ok: true; steps: Step[]; totalTurns: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!Array.isArray(raw)) return { ok: false };

  const hasMessage = raw.some(
    (e) =>
      e !== null &&
      typeof e === "object" &&
      (e as Record<string, unknown>).type === "message",
  );
  if (!hasMessage) return { ok: false };

  const steps: Step[] = [];
  const toolResponses = new Map<string, ToolResponse>();
  let totalTurns = 0;

  for (let idx = 0; idx < raw.length; idx++) {
    const event = raw[idx];
    const turn = idx;
    if (!event || typeof event !== "object") continue;
    const e = event as Record<string, unknown>;
    if (e.type !== "message") continue;

    const msg = e.message;
    if (!msg || typeof msg !== "object") continue;
    const m = msg as Record<string, unknown>;
    const role = m.role;
    const content = m.content;
    if (!Array.isArray(content)) continue;

    if (role === "user") {
      totalTurns += 1;
      const text = content
        .filter(
          (b) =>
            b !== null &&
            typeof b === "object" &&
            (b as Record<string, unknown>).type === "text",
        )
        .map((b) => String((b as Record<string, unknown>).text ?? ""))
        .map((t) => t.trim())
        .filter(Boolean)
        .join("\n\n");
      if (text) steps.push({ kind: "user", text, turn });
      continue;
    }

    if (role === "toolResult") {
      const callId =
        typeof m.toolCallId === "string" ? m.toolCallId : undefined;
      if (!callId) continue;
      const text = content
        .filter(
          (b) =>
            b !== null &&
            typeof b === "object" &&
            (b as Record<string, unknown>).type === "text",
        )
        .map((b) => String((b as Record<string, unknown>).text ?? ""))
        .join("\n\n");
      toolResponses.set(callId, {
        text,
        isError: m.isError === true,
      });
      continue;
    }

    if (role === "assistant") {
      totalTurns += 1;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "thinking") {
          const t = String(b.thinking ?? "").trim();
          if (t) steps.push({ kind: "thinking", text: t, turn });
        } else if (b.type === "text") {
          const t = String(b.text ?? "").trim();
          if (t) steps.push({ kind: "assistant", text: t, turn });
        } else if (b.type === "toolCall") {
          const name = typeof b.name === "string" ? b.name : "tool";
          steps.push({
            kind: "toolCall",
            name,
            args: b.arguments,
            callId: typeof b.id === "string" ? b.id : undefined,
            turn,
          });
        }
      }
    }
  }

  for (const step of steps) {
    if (step.kind === "toolCall" && step.callId) {
      const response = toolResponses.get(step.callId);
      if (response) step.response = response;
    }
  }

  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.kind === "assistant") {
      steps[i] = { kind: "response", text: s.text, turn: s.turn };
      break;
    }
  }

  return { ok: true, steps, totalTurns };
}
