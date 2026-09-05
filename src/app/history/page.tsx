import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HistoryList } from "@/components/HistoryList";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">History</h1>
      <p className="mt-1 text-sm text-foreground-muted">Your saved searches. Private to your account.</p>
      <div className="mt-6">
        <HistoryList />
      </div>
    </div>
  );
}
