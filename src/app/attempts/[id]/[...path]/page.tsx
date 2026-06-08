import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";
import { AttemptBrowser } from "@/components/AttemptBrowser";
import type { FileNode } from "@/lib/types";

export const dynamic = "force-dynamic";

function findNode(tree: FileNode, target: string): FileNode | null {
  if (tree.path === target) return tree;
  if (tree.kind === "dir") {
    for (const child of tree.children) {
      const hit = findNode(child, target);
      if (hit) return hit;
    }
  }
  return null;
}

export default async function AttemptFilePage({
  params,
}: {
  params: { id: string; path: string[] };
}) {
  const { id, path } = params;
  const tree = await storage.getAttemptTree(id);
  if (!tree) notFound();

  const targetPath = path.map((seg) => decodeURIComponent(seg)).join("/");
  const node = findNode(tree, targetPath);
  if (!node) notFound();

  const initialOpen =
    node.kind === "file"
      ? ({ kind: "file" as const, path: node.path })
      : ({ kind: "dir" as const, path: node.path });

  return (
    <div className="space-y-3">
      <AttemptBrowser attemptId={id} tree={tree} initialOpen={initialOpen} />
    </div>
  );
}
