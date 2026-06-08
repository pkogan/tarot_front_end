import type { AttemptSummary, FileContent, FileNode } from "@/lib/types";
import { fsBackend } from "./fs-backend";
import { blobBackend } from "./blob-backend";

export interface StorageBackend {
  listAttempts(): Promise<AttemptSummary[]>;
  getAttemptTree(attemptId: string): Promise<FileNode | null>;
  getFile(attemptId: string, path: string): Promise<FileContent | null>;
}

function getBackend(): StorageBackend {
  const choice = (process.env.STORAGE_BACKEND ?? "fs").toLowerCase();
  if (choice === "blob") return blobBackend;
  return fsBackend;
}

export const storage: StorageBackend = getBackend();

export const STORAGE_BACKEND_NAME = (process.env.STORAGE_BACKEND ?? "fs").toLowerCase();
