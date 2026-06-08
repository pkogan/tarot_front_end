import { list, head, type ListBlobResult } from "@vercel/blob";
import type { AttemptManifest, AttemptSummary, FileContent, FileNode } from "@/lib/types";
import { guessContentType } from "@/lib/content-type";
import type { StorageBackend } from "./index";

/**
 * Blob layout written by the ingestion script:
 *
 *   attempts/<attemptId>/<relative/file/path>     // the actual file blobs
 *   manifests/<attemptId>.json                    // index for fast listing + tree
 *
 * Listing every blob on every request would be slow and expensive, so we always
 * read the manifest. The ingestion script is responsible for keeping it in sync.
 */

const ATTEMPTS_PREFIX = "attempts/";
const MANIFEST_PREFIX = "manifests/";

function ensureToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Connect a Vercel Blob store or switch STORAGE_BACKEND to 'fs'.",
    );
  }
}

async function fetchManifest(attemptId: string): Promise<AttemptManifest | null> {
  ensureToken();
  const key = `${MANIFEST_PREFIX}${attemptId}.json`;
  try {
    const meta = await head(key);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AttemptManifest;
  } catch {
    return null;
  }
}

function manifestToTree(manifest: AttemptManifest): FileNode {
  const root: FileNode = { kind: "dir", name: manifest.id, path: "", children: [] };
  for (const file of manifest.files) {
    const parts = file.path.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      const childPath = parts.slice(0, i + 1).join("/");
      if (isLast) {
        (cursor.children as FileNode[]).push({
          kind: "file",
          name,
          path: file.path,
          size: file.size,
          contentType: file.contentType,
        });
      } else {
        let dir = (cursor.children as FileNode[]).find(
          (c) => c.kind === "dir" && c.name === name,
        ) as Extract<FileNode, { kind: "dir" }> | undefined;
        if (!dir) {
          dir = { kind: "dir", name, path: childPath, children: [] };
          (cursor.children as FileNode[]).push(dir);
        }
        cursor = dir;
      }
    }
  }
  const sortRec = (node: FileNode) => {
    if (node.kind === "dir") {
      node.children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortRec);
    }
  };
  sortRec(root);
  return root;
}

export const blobBackend: StorageBackend = {
  async listAttempts(): Promise<AttemptSummary[]> {
    ensureToken();
    const summaries: AttemptSummary[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page: ListBlobResult = await list({
        prefix: MANIFEST_PREFIX,
        cursor,
        limit: 1000,
      });
      for (const blob of page.blobs) {
        const id = blob.pathname.slice(MANIFEST_PREFIX.length).replace(/\.json$/, "");
        if (!id) continue;
        try {
          const res = await fetch(blob.url, { cache: "no-store" });
          if (!res.ok) continue;
          const manifest = (await res.json()) as AttemptManifest;
          let preview: string | undefined;
          const instruction = manifest.files.find((f) => f.path === "instruction.md");
          if (instruction) {
            try {
              const fileMeta = await head(`${ATTEMPTS_PREFIX}${id}/instruction.md`);
              const r = await fetch(fileMeta.url, { cache: "no-store" });
              if (r.ok) preview = (await r.text()).slice(0, 280);
            } catch {
              // optional preview
            }
          }
          summaries.push({
            id,
            fileCount: manifest.files.length,
            totalBytes: manifest.files.reduce((s, f) => s + f.size, 0),
            updatedAt: manifest.updatedAt,
            instructionPreview: preview,
          });
        } catch {
          // skip malformed manifest
        }
      }
      cursor = page.cursor;
    } while (cursor);
    summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return summaries;
  },

  async getAttemptTree(attemptId: string): Promise<FileNode | null> {
    const manifest = await fetchManifest(attemptId);
    if (!manifest) return null;
    return manifestToTree(manifest);
  },

  async getFile(attemptId: string, relPath: string): Promise<FileContent | null> {
    ensureToken();
    if (!attemptId || !relPath || relPath.includes("..")) return null;
    const key = `${ATTEMPTS_PREFIX}${attemptId}/${relPath}`;
    try {
      const meta = await head(key);
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok || !res.body) return null;
      return {
        path: relPath,
        size: meta.size,
        contentType: meta.contentType ?? guessContentType(relPath),
        body: res.body,
      };
    } catch {
      return null;
    }
  },
};
