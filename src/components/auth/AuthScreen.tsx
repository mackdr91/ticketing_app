/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Slate/Indigo authentication screen supporting email/password login, registration, and 1-click demo role sign-in.
 */

"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Users,
} from "lucide-react";
import { DemoAccount, UserRole, UserSummary } from "@/types/ticket";
import { RoleBadge } from "@/components/ui/TicketBadges";
import { useTheme } from "@/components/layout/ThemeProvider";

interface AuthScreenProps {
  demoAccounts: DemoAccount[];
  onAuthenticated: (user: UserSummary) => void;
}

export function AuthScreen({
  demoAccounts,
  onAuthenticated,
}: AuthScreenProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@pulsedesk.io");
  const [password, setPassword] = useState("Password123!");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { name, email, password, department, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        user?: UserSummary;
        error?: string;
      };

      if (!response.ok || !data.user) {
        setError(data.error ?? "Authentication failed.");
        setLoading(false);
        return;
      }

      onAuthenticated(data.user);
    } catch {
      setError("Network error while communicating with authentication server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin(demoEmail: string) {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: demoEmail,
          password: "Password123!",
        }),
      });
      const data = (await response.json()) as {
        user?: UserSummary;
        error?: string;
      };
      if (!response.ok || !data.user) {
        setError(data.error ?? "Demo login failed.");
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError("Network error during demo login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Subtle Indigo Top Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-500/15 via-indigo-500/5 to-transparent" />

      {/* Top Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              PulseDesk
            </span>
            <span className="ml-2 rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
              IT &amp; SUPPORT HELPDESK
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {resolvedTheme === "dark" ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Switch to Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-600" />
              <span>Switch to Dark Theme</span>
            </>
          )}
        </button>
      </header>

      {/* Main Split Content */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Value Proposition & 1-Click Role Switcher */}
        <div className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Real-Time SLA Tracking, Split-Pane Triage &amp; Kanban</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Precision IT &amp; Customer Support Operations.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Triage high-priority incidents, collaborate with internal staff
            notes, monitor live SLA countdowns, and resolve customer requests
            from a unified Linear-style workspace.
          </p>

          {/* 1-Click Demo Role Access */}
          <div className="rounded-xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/70">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  Instant 1-Click Demo Role Sign-In
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Password: <code className="font-mono">Password123!</code>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {demoAccounts.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin(acct.email)}
                  className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-left transition hover:border-indigo-500 hover:bg-indigo-50/40 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-500/70 dark:hover:bg-indigo-950/30"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <RoleBadge role={acct.role} />
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {acct.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {acct.department}
                    </p>
                  </div>
                  <p className="mt-2 truncate font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                    {acct.email}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Login / Register Form */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/90">
            <div className="mb-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="auth-department"
                        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Department
                      </label>
                      <input
                        id="auth-department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Engineering"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-role"
                        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Account Role
                      </label>
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="CUSTOMER">Customer / Requester</option>
                        <option value="AGENT">Support Agent</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {loading
                    ? "Authenticating..."
                    : mode === "login"
                      ? "Sign In to Workspace"
                      : "Create PulseDesk Account"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
        PulseDesk Helpdesk Platform • Role-Based Access Control • Real-Time SLA
        Engine
      </footer>
    </div>
  );
}
