import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { TRPCReactProvider } from "~/trpc/react";
import { CrossTabSyncProvider } from "~/components/providers/CrossTabSyncProvider";
import { HighContrastProvider } from "~/components/providers/HighContrastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowmind",
  description: "A cognitive interface for capturing, connecting, and composing thought.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <TRPCReactProvider>
          <CrossTabSyncProvider />
          <HighContrastProvider />
          {children}
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
