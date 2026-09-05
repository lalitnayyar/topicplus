import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SearchRunsCompare } from "@/components/SearchRunsCompare";

export default async function SearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <SearchRunsCompare searchId={id} />
    </div>
  );
}
