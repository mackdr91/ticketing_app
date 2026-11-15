/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Root application layout with FOUC-preventing color-scheme meta initialization and Slate/Indigo theme wrapper.
 */

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "PulseDesk — IT & Customer Support Helpdesk",
  description:
    "Modern SaaS IT & Customer Support Helpdesk Ticketing System with SLA tracking, Kanban board, and real-time updates.",
  icons: {
    icon: "/favicon.svg",
  },
};

const foucPreventionScript = `
try {
  var stored = localStorage.getItem("color-scheme");
  var meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.content = stored || "light dark";
  }
  var isLight = stored === "light" || (!stored && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("dark", !isLight);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: foucPreventionScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500/25 selection:text-indigo-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
