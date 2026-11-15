/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Modern SaaS application shell with collapsible sidebar, 1-click role switcher, real-time SSE listener, notification bell popover, and workspace router.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCheck,
  Columns3,
  Inbox,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Sun,
  UserCheck,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  formatRelativeTime,
  RoleBadge,
  UserAvatar,
} from "@/components/ui/TicketBadges";
import {
  SplitTicketWorkspace,
  TicketFilters,
} from "@/components/tickets/SplitTicketWorkspace";
import { KanbanBoard } from "@/components/tickets/KanbanBoard";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";
import {
  DemoAccount,
  NotificationItem,
  TicketItem,
  UserSummary,
} from "@/types/ticket";

export type WorkspaceView =
  | "QUEUE"
  | "KANBAN"
  | "SLA_WATCHLIST"
  | "MY_TICKETS"
  | "ANALYTICS";

interface AppShellProps {
  currentUser: UserSummary;
  staffUsers: UserSummary[];
  demoAccounts: DemoAccount[];
  onUserChanged: (user: UserSummary | null) => void;
}

const DEFAULT_FILTERS: TicketFilters = {
  search: "",
  status: "ALL",
  priority: "ALL",
  category: "ALL",
  slaState: "ALL",
  assigneeId: "ALL",
};

export function AppShell({
  currentUser,
  staffUsers,
  demoAccounts,
  onUserChanged,
}: AppShellProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("QUEUE");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Notifications & Real-Time SSE state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const isStaff =
    currentUser.role === "ADMIN" || currentUser.role === "AGENT";

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.status !== "ALL") params.set("status", filters.status);
      if (filters.priority !== "ALL") params.set("priority", filters.priority);
      if (filters.category !== "ALL") params.set("category", filters.category);
      if (filters.slaState !== "ALL") params.set("slaState", filters.slaState);
      if (filters.assigneeId !== "ALL")
        params.set("assigneeId", filters.assigneeId);

      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as { tickets: TicketItem[] };
        setTickets(data.tickets);
      }
    } finally {
      setLoadingTickets(false);
    }
  }, [filters]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = (await response.json()) as {
          notifications: NotificationItem[];
          unreadCount: number;
        };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore background poll error
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets, refreshSignal, currentUser.id]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications, refreshSignal, currentUser.id]);

  // Connect to Server-Sent Events (/api/events) for live updates
  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          summary?: string;
          actorId?: string;
        };
        if (payload.type === "CONNECTED") {
          setSseConnected(true);
          return;
        }
        setRefreshSignal((prev) => prev + 1);
        if (payload.summary && payload.actorId !== currentUser.id) {
          setLiveToast(payload.summary);
          setTimeout(() => setLiveToast(null), 4000);
        }
      } catch {
        // Ignore malformed event
      }
    };

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser.id]);

  function handleNavigateView(view: WorkspaceView) {
    setActiveView(view);
    if (view === "SLA_WATCHLIST") {
      setFilters({
        ...DEFAULT_FILTERS,
        slaState: "BREACHED",
      });
    } else if (view === "MY_TICKETS") {
      setFilters({
        ...DEFAULT_FILTERS,
        assigneeId: isStaff ? "ME" : "ALL",
      });
    } else if (view === "QUEUE") {
      setFilters(DEFAULT_FILTERS);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    void fetchNotifications();
  }

  async function handleQuickSwitchRole(email: string) {
    if (email === currentUser.email) return;
    setSwitchingRole(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      if (response.ok) {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as { user: UserSummary | null };
        setSelectedTicketId(null);
        setFilters(DEFAULT_FILTERS);
        onUserChanged(meData.user);
      }
    } finally {
      setSwitchingRole(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onUserChanged(null);
  }

  const breachedOrAtRiskCount = tickets.filter(
    (t) => t.sla.state === "BREACHED" || t.sla.state === "AT_RISK"
  ).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Collapsible SaaS Sidebar */}
      <aside
        className={`flex h-full shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-100/90 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
                <Activity className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    PulseDesk
                  </span>
                  <span className="ml-1.5 rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    v1.0
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Primary Create Ticket CTA */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>New Support Ticket</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main workspace navigation" className="space-y-1 px-2.5">
            <button
              type="button"
              onClick={() => handleNavigateView("QUEUE")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                activeView === "QUEUE"
                  ? "bg-indigo-600/10 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>Split-Pane Queue</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavigateView("KANBAN")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                activeView === "KANBAN"
                  ? "bg-indigo-600/10 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Columns3 className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>Kanban Board</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavigateView("SLA_WATCHLIST")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                activeView === "SLA_WATCHLIST"
                  ? "bg-rose-500/10 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                {!sidebarCollapsed && <span>SLA Watchlist</span>}
              </div>
              {!sidebarCollapsed && breachedOrAtRiskCount > 0 && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-600 dark:text-rose-300">
                  {breachedOrAtRiskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavigateView("MY_TICKETS")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                activeView === "MY_TICKETS"
                  ? "bg-indigo-600/10 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span>{isStaff ? "Assigned to Me" : "My Submissions"}</span>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNavigateView("ANALYTICS")}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                activeView === "ANALYTICS"
                  ? "bg-indigo-600/10 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>Analytics &amp; KPIs</span>}
              </div>
            </button>
          </nav>

          {/* Instant Demo Role Switcher in Sidebar */}
          {!sidebarCollapsed && demoAccounts.length > 0 && (
            <div className="mx-3 mt-6 rounded-xl border border-slate-200/90 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Users className="h-3 w-3 text-indigo-500" />
                <span>Quick Role Switcher</span>
              </div>
              <div className="space-y-1">
                {demoAccounts.map((demo) => {
                  const isCurrent = demo.email === currentUser.email;
                  return (
                    <button
                      key={demo.email}
                      type="button"
                      disabled={switchingRole || isCurrent}
                      onClick={() => handleQuickSwitchRole(demo.email)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition ${
                        isCurrent
                          ? "bg-indigo-600/15 font-semibold text-indigo-700 dark:text-indigo-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">{demo.name}</span>
                      <RoleBadge role={demo.role} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Profile & Live Stream Status */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="mb-2.5 flex items-center gap-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Radio
                className={`h-3 w-3 ${
                  sseConnected
                    ? "animate-pulse text-emerald-500"
                    : "text-amber-500"
                }`}
              />
              <span>
                {sseConnected ? "Real-Time SSE Active" : "Reconnecting Stream"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <UserAvatar
                name={currentUser.name}
                color={currentUser.avatarColor}
                size="sm"
              />
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <RoleBadge role={currentUser.role} />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Workspace Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              {activeView === "QUEUE" && "Support Triage Queue"}
              {activeView === "KANBAN" && "Kanban Workflow Board"}
              {activeView === "SLA_WATCHLIST" && "SLA Breach & At-Risk Watchlist"}
              {activeView === "MY_TICKETS" &&
                (isStaff ? "My Assigned Tickets" : "My Submitted Tickets")}
              {activeView === "ANALYTICS" && "Helpdesk Analytics & SLA Metrics"}
            </h1>
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 sm:inline-block dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              {currentUser.department}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Event Toast */}
            {liveToast && (
              <div className="hidden items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 md:flex dark:text-indigo-300">
                <Radio className="h-3 w-3 animate-pulse text-indigo-500" />
                <span>{liveToast}</span>
              </div>
            )}

            {/* Notification Bell & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label="Toggle notifications"
                className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                      {notifications.map((notif) => (
                        <li key={notif.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (notif.ticketId) {
                                if (activeView === "ANALYTICS") {
                                  setActiveView("QUEUE");
                                }
                                setSelectedTicketId(notif.ticketId);
                              }
                            }}
                            className={`w-full rounded-lg p-2.5 text-left text-xs transition ${
                              notif.isRead
                                ? "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                : "bg-indigo-500/10 font-medium text-slate-900 hover:bg-indigo-500/15 dark:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatRelativeTime(notif.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {notif.message}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                resolvedTheme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Active Workspace View */}
        {activeView === "ANALYTICS" ? (
          <AnalyticsDashboard
            refreshSignal={refreshSignal}
            onSelectTicket={(id) => {
              setActiveView("QUEUE");
              setSelectedTicketId(id);
            }}
          />
        ) : activeView === "KANBAN" ? (
          <KanbanBoard
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={setSelectedTicketId}
            currentUser={currentUser}
            staffUsers={staffUsers}
            refreshSignal={refreshSignal}
            onTicketUpdated={() => setRefreshSignal((prev) => prev + 1)}
          />
        ) : (
          <SplitTicketWorkspace
            tickets={tickets}
            loading={loadingTickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={setSelectedTicketId}
            filters={filters}
            onUpdateFilters={(next) =>
              setFilters((prev) => ({ ...prev, ...next }))
            }
            onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            currentUser={currentUser}
            staffUsers={staffUsers}
            refreshSignal={refreshSignal}
            onTicketUpdated={() => setRefreshSignal((prev) => prev + 1)}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        )}
      </div>

      {/* Create Ticket Native Dialog Modal */}
      <CreateTicketModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        currentUser={currentUser}
        staffUsers={staffUsers}
        onTicketCreated={(created) => {
          setRefreshSignal((prev) => prev + 1);
          setSelectedTicketId(created.id);
        }}
      />
    </div>
  );
}
