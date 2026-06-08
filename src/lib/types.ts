export type AttemptSummary = {
  id: string;
  fileCount: number;
  totalBytes: number;
  updatedAt: string;
  instructionPreview?: string;
};

export type FileNode =
  | {
      kind: "dir";
      name: string;
      path: string;
      children: FileNode[];
    }
  | {
      kind: "file";
      name: string;
      path: string;
      size: number;
      contentType: string;
    };

export type AttemptManifest = {
  id: string;
  files: Array<{
    path: string;
    size: number;
    contentType: string;
    updatedAt: string;
  }>;
  updatedAt: string;
};

export type FileContent = {
  path: string;
  size: number;
  contentType: string;
  body: ReadableStream<Uint8Array> | Buffer;
};
