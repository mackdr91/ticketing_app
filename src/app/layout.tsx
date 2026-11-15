/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Root application layout providing HTML structure and metadata for PulseDesk.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseDesk — IT & Customer Support Helpdesk",
  description: "Modern SaaS IT & Customer Support Helpdesk Ticketing System with SLA tracking, Kanban board, and real-time updates.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
