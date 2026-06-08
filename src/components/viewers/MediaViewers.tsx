"use client";

export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-center justify-center bg-ink-900/60 border border-ink-800 rounded-lg p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-w-full max-h-[70vh] rounded" />
    </div>
  );
}

export function AudioViewer({ src }: { src: string }) {
  return (
    <div className="bg-ink-900/60 border border-ink-800 rounded-lg p-6 flex items-center justify-center">
      <audio src={src} controls className="w-full max-w-xl" />
    </div>
  );
}

export function VideoViewer({ src }: { src: string }) {
  return (
    <div className="bg-ink-900/60 border border-ink-800 rounded-lg p-2 flex items-center justify-center">
      <video src={src} controls className="max-w-full max-h-[70vh] rounded" />
    </div>
  );
}

export function PdfViewer({ src }: { src: string }) {
  return (
    <iframe
      src={src}
      className="w-full h-[80vh] rounded-lg border border-ink-800 bg-ink-900"
      title="PDF preview"
    />
  );
}
