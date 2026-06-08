import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";
import { AttemptBrowser } from "@/components/AttemptBrowser";

export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const tree = await storage.getAttemptTree(id);
  if (!tree) notFound();

  return (
    <div className="space-y-3">
      <AttemptBrowser attemptId={id} tree={tree} />
    </div>
  );
}
