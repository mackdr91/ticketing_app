/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Root page entry point coordinating session state between AuthScreen and the main AppShell workspace.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";
import { DemoAccount, UserSummary } from "@/types/ticket";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [staffUsers, setStaffUsers] = useState<UserSummary[]>([]);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [initializing, setInitializing] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = (await response.json()) as {
          user: UserSummary | null;
          staffUsers: UserSummary[];
          demoAccounts: DemoAccount[];
        };
        setCurrentUser(data.user);
        setStaffUsers(data.staffUsers ?? []);
        setDemoAccounts(data.demoAccounts ?? []);
      }
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (initializing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          Initializing PulseDesk Workspace...
        </p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        demoAccounts={demoAccounts}
        onAuthenticated={() => {
          void loadSession();
        }}
      />
    );
  }

  return (
    <AppShell
      currentUser={currentUser}
      staffUsers={staffUsers}
      demoAccounts={demoAccounts}
      onUserChanged={(user) => {
        if (!user) {
          setCurrentUser(null);
        } else {
          void loadSession();
        }
      }}
    />
  );
}
