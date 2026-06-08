"use client";

import { useMemo, useState } from "react";

type Props = { text: string };

export function JsonViewer({ text }: Props) {
  const [mode, setMode] = useState<"tree" | "raw">("tree");
  const parsed = useMemo<
    { ok: true; value: unknown } | { ok: false; error: string }
  >(() => {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, [text]);

  if (!parsed.ok) {
    return (
      <div>
        <div className="text-xs text-rose-700 dark:text-rose-300 mb-2">
          Invalid JSON — showing raw text. ({parsed.error})
        </div>
        <pre className="text-xs font-mono bg-ink-900/60 border border-ink-800 rounded-lg p-4 overflow-x-auto scroll-thin">
          {text}
        </pre>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ToggleButton active={mode === "tree"} onClick={() => setMode("tree")}>
          Tree
        </ToggleButton>
        <ToggleButton active={mode === "raw"} onClick={() => setMode("raw")}>
          Raw
        </ToggleButton>
      </div>
      {mode === "tree" ? (
        <div className="bg-ink-900/60 border border-ink-800 rounded-lg p-4 font-mono text-[12.5px] overflow-x-auto scroll-thin">
          <JsonNode value={parsed.value} depth={0} initiallyOpen />
        </div>
      ) : (
        <pre className="text-xs font-mono bg-ink-900/60 border border-ink-800 rounded-lg p-4 overflow-x-auto scroll-thin">
          {JSON.stringify(parsed.value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded border ${
        active
          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
          : "bg-ink-900 border-ink-800 text-ink-400 hover:text-ink-200"
      }`}
    >
      {children}
    </button>
  );
}

function JsonNode({
  value,
  depth,
  keyName,
  initiallyOpen = false,
}: {
  value: unknown;
  depth: number;
  keyName?: string;
  initiallyOpen?: boolean;
}) {
  if (value === null) return <ScalarLine keyName={keyName} text="null" className="text-ink-400" />;
  if (typeof value === "string")
    return (
      <ScalarLine
        keyName={keyName}
        text={JSON.stringify(value)}
        className="text-emerald-700 dark:text-emerald-300"
      />
    );
  if (typeof value === "number")
    return (
      <ScalarLine
        keyName={keyName}
        text={String(value)}
        className="text-sky-700 dark:text-sky-300"
      />
    );
  if (typeof value === "boolean")
    return (
      <ScalarLine
        keyName={keyName}
        text={String(value)}
        className="text-amber-700 dark:text-amber-300"
      />
    );
  if (Array.isArray(value))
    return (
      <CollapsibleNode
        keyName={keyName}
        open={initiallyOpen || depth < 1}
        summary={`Array(${value.length})`}
      >
        {value.map((v, i) => (
          <JsonNode key={i} value={v} depth={depth + 1} keyName={String(i)} />
        ))}
      </CollapsibleNode>
    );
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <CollapsibleNode
        keyName={keyName}
        open={initiallyOpen || depth < 1}
        summary={`Object(${entries.length})`}
      >
        {entries.map(([k, v]) => (
          <JsonNode key={k} value={v} depth={depth + 1} keyName={k} />
        ))}
      </CollapsibleNode>
    );
  }
  return null;
}

function ScalarLine({
  keyName,
  text,
  className,
}: {
  keyName?: string;
  text: string;
  className?: string;
}) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {keyName !== undefined && (
        <span className="text-ink-400">{keyName}: </span>
      )}
      <span className={className}>{text}</span>
    </div>
  );
}

function CollapsibleNode({
  keyName,
  open,
  summary,
  children,
}: {
  keyName?: string;
  open: boolean;
  summary: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="text-left"
      >
        <span className="text-ink-500 mr-1">{isOpen ? "▾" : "▸"}</span>
        {keyName !== undefined && (
          <span className="text-ink-400">{keyName}: </span>
        )}
        <span className="text-ink-300">{summary}</span>
      </button>
      {isOpen && <div className="pl-4 border-l border-ink-800 ml-1">{children}</div>}
    </div>
  );
}
