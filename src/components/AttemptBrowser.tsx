"use client";

import { useEffect, useMemo, useState } from "react";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { DirectoryListing } from "./DirectoryListing";
import type { FileNode } from "@/lib/types";

type TabEntry =
  | { kind: "file"; path: string }
  | { kind: "dir"; path: string };

type PaneId = "left" | "right";

type PaneState = {
  openTabs: TabEntry[];
  activeTab: TabEntry | null;
};

type Props = {
  attemptId: string;
  tree: FileNode;
  initialOpen?: TabEntry;
};

type TabRender = { entry: TabEntry; name: string; title: string };

const PRIMARY_CANDIDATES = ["instruction.md", "README.md", "readme.md"];
const LISTING_DIR_NAMES = new Set(["input_files", "output_files"]);
const EVAL_FILE_PATTERN = /^eval_.*\.json$/i;

function tabKey(t: TabEntry): string {
  return `${t.kind}:${t.path}`;
}

function tabsEqual(a: TabEntry, b: TabEntry): boolean {
  return a.kind === b.kind && a.path === b.path;
}

function encodeTab(t: TabEntry): string {
  return `${t.kind}:${encodeURIComponent(t.path)}`;
}

function decodeTab(raw: string): TabEntry | null {
  if (!raw) return null;
  if (raw.startsWith("dir:")) {
    return { kind: "dir", path: decodeURIComponent(raw.slice(4)) };
  }
  if (raw.startsWith("file:")) {
    return { kind: "file", path: decodeURIComponent(raw.slice(5)) };
  }
  return { kind: "file", path: decodeURIComponent(raw) };
}

function isEvalPath(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  if (!segments.includes("evals")) return false;
  const filename = segments[segments.length - 1] ?? "";
  return EVAL_FILE_PATTERN.test(filename);
}

function paneForEntry(entry: TabEntry): PaneId {
  if (entry.kind === "file" && isEvalPath(entry.path)) return "left";
  return "right";
}

function encodeHash(left: TabEntry | null, right: TabEntry | null): string {
  const parts: string[] = [];
  if (left) parts.push(`l=${encodeTab(left)}`);
  if (right) parts.push(`r=${encodeTab(right)}`);
  return parts.join("&");
}

function decodeHash(hash: string): { left: TabEntry | null; right: TabEntry | null } {
  if (!hash) return { left: null, right: null };
  if (hash.includes("=")) {
    let left: TabEntry | null = null;
    let right: TabEntry | null = null;
    for (const part of hash.split("&")) {
      if (part.startsWith("l=")) left = decodeTab(part.slice(2));
      else if (part.startsWith("r=")) right = decodeTab(part.slice(2));
    }
    return { left, right };
  }
  // Legacy hash form: a single tab.
  const tab = decodeTab(hash);
  if (!tab) return { left: null, right: null };
  return paneForEntry(tab) === "left"
    ? { left: tab, right: null }
    : { left: null, right: tab };
}

const EMPTY_PANE: PaneState = { openTabs: [], activeTab: null };

export function AttemptBrowser({ attemptId, tree, initialOpen }: Props) {
  const allFiles = useMemo(() => flattenFiles(tree), [tree]);
  const dirIndex = useMemo(() => indexDirs(tree), [tree]);

  const validateEntry = (entry: TabEntry): boolean => {
    if (entry.kind === "file") return allFiles.some((f) => f.path === entry.path);
    return dirIndex.has(entry.path);
  };

  const initialPanes = useMemo<{ left: PaneState; right: PaneState }>(() => {
    let candidate: TabEntry | null = null;
    if (initialOpen && validateEntry(initialOpen)) {
      candidate = initialOpen;
    } else {
      for (const c of PRIMARY_CANDIDATES) {
        const match = allFiles.find((f) => f.path === c);
        if (match) {
          candidate = { kind: "file", path: match.path };
          break;
        }
      }
      if (!candidate && allFiles[0]) {
        candidate = { kind: "file", path: allFiles[0].path };
      }
    }
    if (!candidate) return { left: EMPTY_PANE, right: EMPTY_PANE };
    const pane = paneForEntry(candidate);
    if (pane === "left") {
      return {
        left: { openTabs: [candidate], activeTab: candidate },
        right: EMPTY_PANE,
      };
    }
    return {
      left: EMPTY_PANE,
      right: { openTabs: [candidate], activeTab: candidate },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFiles, dirIndex, initialOpen]);

  const [left, setLeft] = useState<PaneState>(initialPanes.left);
  const [right, setRight] = useState<PaneState>(initialPanes.right);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rubricFocus, setRubricFocus] = useState<{
    path: string;
    id: string;
    token: number;
  } | null>(null);

  const setPane = (id: PaneId, updater: (p: PaneState) => PaneState) => {
    if (id === "left") setLeft(updater);
    else setRight(updater);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialOpen) {
      const pane = paneForEntry(initialOpen);
      const canonicalHash = encodeHash(
        pane === "left" ? initialOpen : null,
        pane === "right" ? initialOpen : null,
      );
      const canonical = `/attempts/${encodeURIComponent(attemptId)}${
        canonicalHash ? `#${canonicalHash}` : ""
      }`;
      if (window.location.pathname + window.location.hash !== canonical) {
        window.history.replaceState(null, "", canonical);
      }
      return;
    }
    const fromHash = window.location.hash.replace(/^#/, "");
    if (!fromHash) return;
    const { left: l, right: r } = decodeHash(fromHash);
    if (l && validateEntry(l)) {
      setLeft({ openTabs: [l], activeTab: l });
    }
    if (r && validateEntry(r)) {
      setRight({ openTabs: [r], activeTab: r });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFiles, dirIndex, attemptId, initialOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const encoded = encodeHash(left.activeTab, right.activeTab);
    const currentHash = window.location.hash.replace(/^#/, "");
    if (currentHash === encoded) return;
    if (!encoded) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      return;
    }
    window.history.replaceState(null, "", `#${encoded}`);
  }, [left.activeTab, right.activeTab]);

  const openInPane = (entry: TabEntry, paneId: PaneId) => {
    setPane(paneId, (p) => ({
      openTabs: p.openTabs.some((t) => tabsEqual(t, entry))
        ? p.openTabs
        : [...p.openTabs, entry],
      activeTab: entry,
    }));
  };

  const openFile = (path: string) => {
    const entry: TabEntry = { kind: "file", path };
    openInPane(entry, paneForEntry(entry));
  };

  const openDir = (path: string) => {
    const entry: TabEntry = { kind: "dir", path };
    openInPane(entry, "right");
  };

  const openFileWithFocus = (path: string, criterionId: string) => {
    openFile(path);
    setRubricFocus((prev) => ({
      path,
      id: criterionId,
      token: (prev?.token ?? 0) + 1,
    }));
  };

  const handleDirClick = (path: string, name: string) => {
    if (!LISTING_DIR_NAMES.has(name)) return;
    openDir(path);
  };

  const closeTab = (paneId: PaneId, entry: TabEntry) => {
    setPane(paneId, (p) => {
      const idx = p.openTabs.findIndex((t) => tabsEqual(t, entry));
      if (idx === -1) return p;
      const next = p.openTabs.filter((t) => !tabsEqual(t, entry));
      const wasActive = p.activeTab && tabsEqual(p.activeTab, entry);
      return {
        openTabs: next,
        activeTab: wasActive
          ? next[idx] ?? next[idx - 1] ?? null
          : p.activeTab,
      };
    });
  };

  const reorderTab = (paneId: PaneId, fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setPane(paneId, (p) => {
      const from = p.openTabs.findIndex((t) => tabKey(t) === fromKey);
      const to = p.openTabs.findIndex((t) => tabKey(t) === toKey);
      if (from === -1 || to === -1) return p;
      const next = [...p.openTabs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...p, openTabs: next };
    });
  };

  const setPaneActive = (paneId: PaneId, entry: TabEntry) => {
    setPane(paneId, (p) => ({ ...p, activeTab: entry }));
  };

  const renderTabs = (pane: PaneState): TabRender[] => {
    const out: TabRender[] = [];
    for (const t of pane.openTabs) {
      if (t.kind === "file") {
        const node = allFiles.find((f) => f.path === t.path);
        if (!node) continue;
        out.push({ entry: t, name: node.name, title: node.path });
      } else {
        const node = dirIndex.get(t.path);
        if (!node) continue;
        out.push({ entry: t, name: node.name, title: node.path });
      }
    }
    return out;
  };

  const leftTabs = useMemo(() => renderTabs(left), [left, allFiles, dirIndex]);
  const rightTabs = useMemo(
    () => renderTabs(right),
    [right, allFiles, dirIndex],
  );

  const selectedPaths = useMemo(() => {
    const s = new Set<string>();
    if (left.activeTab) s.add(left.activeTab.path);
    if (right.activeTab) s.add(right.activeTab.path);
    return s;
  }, [left.activeTab, right.activeTab]);

  const showLeft = leftTabs.length > 0;
  const showRight = rightTabs.length > 0;

  // When both panes are open, hide the tree so the two files use the full width.
  useEffect(() => {
    if (showLeft && showRight) setSidebarOpen(false);
  }, [showLeft, showRight]);

  const editorGridCols = showLeft && showRight
    ? "grid-cols-1 lg:grid-cols-2"
    : "grid-cols-1";

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-8rem)]">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="text-xs text-ink-400 hover:text-ink-200 inline-flex items-center gap-1"
        >
          {sidebarOpen ? (
            <>
              <span aria-hidden>←</span> Hide Files Tree
            </>
          ) : (
            "Open File Tree"
          )}
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className={`grid ${editorGridCols} gap-3 h-full min-h-0`}>
          {showRight && (
          <EditorPane
            attemptId={attemptId}
            paneId="right"
            paneState={right}
            tabs={rightTabs}
            allFiles={allFiles}
            dirIndex={dirIndex}
            onActivate={(entry) => setPaneActive("right", entry)}
            onClose={(entry) => closeTab("right", entry)}
            onReorder={(from, to) => reorderTab("right", from, to)}
            onOpenFile={openFile}
            onOpenFileWithFocus={openFileWithFocus}
            rubricFocus={rubricFocus}
            dragKey={dragKey}
            setDragKey={setDragKey}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarToggleHere
            label="Files"
            accent="ink"
          />
        )}
        {showLeft && (
          <EditorPane
            attemptId={attemptId}
            paneId="left"
            paneState={left}
            tabs={leftTabs}
            allFiles={allFiles}
            dirIndex={dirIndex}
            onActivate={(entry) => setPaneActive("left", entry)}
            onClose={(entry) => closeTab("left", entry)}
            onReorder={(from, to) => reorderTab("left", from, to)}
            onOpenFile={openFile}
            onOpenFileWithFocus={openFileWithFocus}
            rubricFocus={rubricFocus}
            dragKey={dragKey}
            setDragKey={setDragKey}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarToggleHere={!showRight}
            label="Evals"
            accent="emerald"
          />
        )}
          {!showLeft && !showRight && (
            <section className="rounded-xl border border-ink-800 bg-ink-900/30 flex items-center justify-center text-ink-500 text-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((o) => !o)}
                  aria-label={sidebarOpen ? "Hide file tree" : "Show file tree"}
                  title={sidebarOpen ? "Hide file tree" : "Show file tree"}
                  className="p-1.5 rounded text-ink-400 hover:text-ink-100 hover:bg-ink-800/60"
                >
                  {sidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
                </button>
                <span>
                  {sidebarOpen
                    ? "Select a file from the tree."
                    : "No file open. Click the panel icon to show the file tree."}
                </span>
              </div>
            </section>
          )}
        </div>

        {sidebarOpen && (
          <>
            <div
              className="absolute inset-0 z-40 bg-ink-950/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <aside className="absolute left-0 top-0 bottom-0 z-50 w-72 rounded-xl border border-ink-800 bg-ink-900 shadow-2xl overflow-y-auto scroll-thin p-2">
              <FileTree
                tree={tree}
                selectedPaths={selectedPaths}
                onSelect={openFile}
                onDirClick={handleDirClick}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function EditorPane({
  attemptId,
  paneId,
  paneState,
  tabs,
  allFiles,
  dirIndex,
  onActivate,
  onClose,
  onReorder,
  onOpenFile,
  onOpenFileWithFocus,
  rubricFocus,
  dragKey,
  setDragKey,
  sidebarOpen,
  setSidebarOpen,
  sidebarToggleHere,
  label,
  accent,
}: {
  attemptId: string;
  paneId: PaneId;
  paneState: PaneState;
  tabs: TabRender[];
  allFiles: Array<Extract<FileNode, { kind: "file" }>>;
  dirIndex: Map<string, Extract<FileNode, { kind: "dir" }>>;
  onActivate: (entry: TabEntry) => void;
  onClose: (entry: TabEntry) => void;
  onReorder: (fromKey: string, toKey: string) => void;
  onOpenFile: (path: string) => void;
  onOpenFileWithFocus: (path: string, criterionId: string) => void;
  rubricFocus: { path: string; id: string; token: number } | null;
  dragKey: string | null;
  setDragKey: (key: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (updater: (open: boolean) => boolean) => void;
  sidebarToggleHere: boolean;
  label: string;
  accent: "emerald" | "ink";
}) {
  const activeTab = paneState.activeTab;
  const activeFile = useMemo(() => {
    if (!activeTab || activeTab.kind !== "file") return null;
    return allFiles.find((f) => f.path === activeTab.path) ?? null;
  }, [allFiles, activeTab]);
  const activeDir = useMemo(() => {
    if (!activeTab || activeTab.kind !== "dir") return null;
    return dirIndex.get(activeTab.path) ?? null;
  }, [dirIndex, activeTab]);

  const labelTone =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : "text-ink-400 border-ink-700 bg-ink-800/50";

  return (
    <section className="rounded-xl border border-ink-800 bg-ink-900/30 flex flex-col overflow-hidden min-h-0">
      <div className="flex items-stretch border-b border-ink-800 bg-ink-900/50 pl-1 pr-2 pt-2 overflow-x-auto scroll-thin">
        {sidebarToggleHere ? (
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Hide file tree" : "Show file tree"}
            title={sidebarOpen ? "Hide file tree" : "Show file tree"}
            className="shrink-0 self-end mb-px mr-1 p-1.5 rounded text-ink-400 hover:text-ink-100 hover:bg-ink-800/60"
          >
            {sidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
          </button>
        ) : null}

        <span
          className={`shrink-0 self-end mb-1 mr-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${labelTone}`}
          title={`${label} pane`}
        >
          {label}
        </span>

        {tabs.length > 0 && (
          <div role="tablist" className="flex items-stretch gap-0.5">
            {tabs.map(({ entry, name, title }) => {
              const key = `${paneId}:${tabKey(entry)}`;
              const isActive = activeTab ? tabsEqual(activeTab, entry) : false;
              const isDragging = dragKey === key;
              return (
                <div
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  draggable
                  onDragStart={(e) => {
                    setDragKey(key);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", key);
                  }}
                  onDragEnd={() => setDragKey(null)}
                  onDragOver={(e) => {
                    if (
                      dragKey &&
                      dragKey !== key &&
                      dragKey.startsWith(`${paneId}:`)
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from =
                      dragKey ?? e.dataTransfer.getData("text/plain");
                    if (from && from.startsWith(`${paneId}:`)) {
                      onReorder(
                        from.slice(paneId.length + 1),
                        key.slice(paneId.length + 1),
                      );
                    }
                    setDragKey(null);
                  }}
                  onClick={() => onActivate(entry)}
                  className={`group flex items-center gap-2 px-3 py-1.5 -mb-px rounded-t-md border border-b-0 text-xs cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? "border-ink-800 bg-ink-900/80 text-ink-100"
                      : "border-transparent text-ink-400 hover:text-ink-200 hover:bg-ink-800/50"
                  } ${isDragging ? "opacity-50" : ""}`}
                  title={title}
                >
                  {entry.kind === "dir" && <FolderTabIcon />}
                  <span className="truncate max-w-[14rem]">{name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(entry);
                    }}
                    aria-label={`Close ${name}`}
                    className="text-ink-500 hover:text-ink-100 rounded p-0.5 hover:bg-ink-700/60"
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-5">
        {activeFile ? (
          <FileViewer
            attemptId={attemptId}
            file={activeFile}
            onOpenFile={onOpenFile}
            onOpenFileWithFocus={onOpenFileWithFocus}
            fileExists={(path) => allFiles.some((f) => f.path === path)}
            focusId={
              rubricFocus && rubricFocus.path === activeFile.path
                ? rubricFocus.id
                : undefined
            }
            focusToken={
              rubricFocus && rubricFocus.path === activeFile.path
                ? rubricFocus.token
                : undefined
            }
          />
        ) : activeDir ? (
          <DirectoryListing dir={activeDir} onOpenFile={onOpenFile} />
        ) : (
          <div className="text-ink-500 text-sm">No file open in this pane.</div>
        )}
      </div>
    </section>
  );
}

function PanelLeftCloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6 2.5v11" />
      <path d="M11 5.5 8.5 8 11 10.5" />
    </svg>
  );
}

function PanelLeftOpenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6 2.5v11" />
      <path d="M8.5 5.5 11 8 8.5 10.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d="M2 2l6 6M8 2l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderTabIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden
      className="text-amber-600 dark:text-amber-400/80 shrink-0"
    >
      <path
        d="M1.5 3.5a1 1 0 0 1 1-1h3.2l1.5 1.5h5.3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8.5Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function flattenFiles(
  node: FileNode,
): Array<Extract<FileNode, { kind: "file" }>> {
  if (node.kind === "file") return [node];
  return node.children.flatMap(flattenFiles);
}

function indexDirs(
  node: FileNode,
): Map<string, Extract<FileNode, { kind: "dir" }>> {
  const out = new Map<string, Extract<FileNode, { kind: "dir" }>>();
  const walk = (n: FileNode) => {
    if (n.kind === "dir") {
      out.set(n.path, n);
      for (const c of n.children) walk(c);
    }
  };
  walk(node);
  return out;
}
