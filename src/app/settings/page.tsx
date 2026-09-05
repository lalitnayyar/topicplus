import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { XConnectionPanel } from "@/components/settings/XConnectionPanel";
import { AIConfigPanel } from "@/components/settings/AIConfigPanel";
import { AppearancePanel } from "@/components/AppearancePanel";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Configure X access and an AI provider to enable live analysis. Demo mode works without either.
        </p>
      </div>

      <AppearancePanel />
      <XConnectionPanel />
      <AIConfigPanel />
    </div>
  );
}
