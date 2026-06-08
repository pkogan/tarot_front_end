"use client";

import { useMemo } from "react";
import type { FileNode } from "@/lib/types";
import { formatBytes } from "@/lib/format";

type Props = {
  dir: Extract<FileNode, { kind: "dir" }>;
  onOpenFile: (path: string) => void;
};

export function DirectoryListing({ dir, onOpenFile }: Props) {
  const files = useMemo(() => flattenFiles(dir), [dir]);
  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  const prefix = dir.path ? `${dir.path}/` : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-ink-100 font-medium truncate">{dir.name}</div>
          <div className="text-xs text-ink-500 font-mono truncate">
            {dir.path}
          </div>
        </div>
        <div className="text-xs text-ink-500 shrink-0 flex items-center gap-3">
          <span>
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
          <span className="w-1 h-1 rounded-full bg-ink-700" />
          <span>{formatBytes(totalBytes)}</span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-sm text-ink-500">This folder is empty.</div>
      ) : (
        <ul className="rounded-lg border border-ink-800 divide-y divide-ink-800 bg-ink-900/40 overflow-hidden">
          {files.map((file) => {
            const rel = file.path.startsWith(prefix)
              ? file.path.slice(prefix.length)
              : file.path;
            return (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => onOpenFile(file.path)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-ink-800/60 focus:outline-none focus:bg-ink-800/60"
                  title={file.path}
                >
                  <span className="font-mono text-xs text-ink-200 truncate">
                    {rel}
                  </span>
                  <span className="text-[10px] tabular-nums text-ink-500 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function flattenFiles(
  node: FileNode,
): Array<Extract<FileNode, { kind: "file" }>> {
  if (node.kind === "file") return [node];
  return node.children.flatMap(flattenFiles);
}
