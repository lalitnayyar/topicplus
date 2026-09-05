import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "TopicPulse",
  description: "Analyze the latest accessible X posts about any topic with a grounded, source-linked report.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
