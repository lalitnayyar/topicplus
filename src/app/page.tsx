import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomeForm } from "@/components/HomeForm";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="tp-animate-in text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          What&apos;s being said about your topic?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-foreground-muted">
          Retrieve up to 100 recent accessible X posts, extract their text, and get a grounded,
          source-linked report with topic match scoring.
        </p>
      </div>

      <div className="tp-animate-in mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <HomeForm />
      </div>
    </div>
  );
}
