const EXT_TO_MIME: Record<string, string> = {
  json: "application/json",
  md: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  py: "text/x-python",
  js: "text/javascript",
  ts: "text/typescript",
  yml: "text/yaml",
  yaml: "text/yaml",
  html: "text/html",
  log: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  zip: "application/zip",
};

export function guessContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

export type FileCategory =
  | "markdown"
  | "json"
  | "csv"
  | "code"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "archive"
  | "binary";

export type CodeLanguage = "python";

export function detectCodeLanguage(filename: string): CodeLanguage | null {
  const name = filename.toLowerCase();
  if (name.endsWith(".py")) return "python";
  return null;
}

export function categorize(contentType: string, filename: string): FileCategory {
  const name = filename.toLowerCase();
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".csv") || name.endsWith(".tsv")) return "csv";
  if (detectCodeLanguage(name)) return "code";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/zip") return "archive";
  if (contentType.startsWith("text/")) return "text";
  return "binary";
}
