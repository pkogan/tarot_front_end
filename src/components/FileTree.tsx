"use client";

import { useMemo, useState } from "react";
import type { FileNode } from "@/lib/types";
import { formatBytes } from "@/lib/format";

type Props = {
  tree: FileNode;
  selectedPaths: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onDirClick?: (path: string, name: string) => void;
};

export function FileTree({ tree, selectedPaths, onSelect, onDirClick }: Props) {
  const initialOpen = useMemo(() => collectInitialOpenDirs(tree), [tree]);
  return (
    <div className="text-sm">
      {tree.kind === "dir" && (
        <DirChildren
          node={tree}
          depth={0}
          openMap={initialOpen}
          selectedPaths={selectedPaths}
          onSelect={onSelect}
          onDirClick={onDirClick}
        />
      )}
    </div>
  );
}

function collectInitialOpenDirs(node: FileNode): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  if (node.kind === "dir") {
    open[node.path] = true;
    for (const child of node.children) {
      if (child.kind === "dir" && depthOf(child.path) <= 1) {
        Object.assign(open, collectInitialOpenDirs(child));
      }
    }
  }
  return open;
}

function depthOf(p: string): number {
  if (!p) return 0;
  return p.split("/").length;
}

function DirChildren({
  node,
  depth,
  openMap,
  selectedPaths,
  onSelect,
  onDirClick,
}: {
  node: Extract<FileNode, { kind: "dir" }>;
  depth: number;
  openMap: Record<string, boolean>;
  selectedPaths: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onDirClick?: (path: string, name: string) => void;
}) {
  const [open, setOpen] = useState(openMap);
  const toggle = (p: string) => setOpen((s) => ({ ...s, [p]: !s[p] }));

  return (
    <ul className="space-y-0.5">
      {node.children.map((child) => {
        if (child.kind === "dir") {
          const isOpen = open[child.path];
          const isSelectedDir = selectedPaths.has(child.path);
          return (
            <li key={child.path}>
              <button
                type="button"
                onClick={() => {
                  toggle(child.path);
                  onDirClick?.(child.path, child.name);
                }}
                className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                  isSelectedDir
                    ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "hover:bg-ink-800/60"
                }`}
                style={{ paddingLeft: 6 + depth * 12 }}
              >
                <Chevron open={isOpen} />
                <FolderIcon />
                <span
                  className={`truncate ${
                    isSelectedDir ? "" : "text-ink-200"
                  }`}
                >
                  {child.name}
                </span>
              </button>
              {isOpen && (
                <DirChildren
                  node={child}
                  depth={depth + 1}
                  openMap={openMap}
                  selectedPaths={selectedPaths}
                  onSelect={onSelect}
                  onDirClick={onDirClick}
                />
              )}
            </li>
          );
        }
        const isSelected = selectedPaths.has(child.path);
        return (
          <li key={child.path}>
            <button
              type="button"
              onClick={() => onSelect(child.path)}
              className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left group ${
                isSelected
                  ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "text-ink-300 hover:bg-ink-800/60"
              }`}
              style={{ paddingLeft: 6 + (depth + 1) * 12 }}
              title={child.path}
            >
              <FileIcon />
              <span className="truncate flex-1">{child.name}</span>
              <span
                className={`text-[10px] tabular-nums ${
                  isSelected
                    ? "text-emerald-700/80 dark:text-emerald-300/70"
                    : "text-ink-500"
                }`}
              >
                {formatBytes(child.size)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={`text-ink-500 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="text-amber-600 dark:text-amber-400/80 shrink-0">
      <path
        d="M1.5 3.5a1 1 0 0 1 1-1h3.2l1.5 1.5h5.3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8.5Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="text-ink-500 shrink-0">
      <path
        d="M3.5 1.5h6L13 5v9a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9.5 1.7v3.6h3.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
