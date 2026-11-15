/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Analytics & KPI dashboard displaying open vs. resolved tickets, SLA compliance rates, priority distribution, agent workload, and live activity feed.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  PRIORITY_LABELS,
  RoleBadge,
  STATUS_LABELS,
  UserAvatar,
} from "@/components/ui/TicketBadges";
import {
  AnalyticsData,
  TicketCategoryType,
  TicketPriorityType,
  TicketStatusType,
} from "@/types/ticket";

interface AnalyticsDashboardProps {
  refreshSignal: number;
  onSelectTicket: (ticketId: string) => void;
}

export function AnalyticsDashboard({
  refreshSignal,
  onSelectTicket,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const payload = (await response.json()) as AnalyticsData;
        setData(payload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshSignal]);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Unable to load analytics metrics.
      </div>
    );
  }

  const { summary, byStatus, byPriority, byCategory, agentWorkload, recentActivity } =
    data;

  const statusBarColors: Record<TicketStatusType, string> = {
    OPEN: "bg-indigo-500",
    IN_PROGRESS: "bg-sky-500",
    WAITING_ON_CUSTOMER: "bg-amber-500",
    RESOLVED: "bg-emerald-500",
    CLOSED: "bg-slate-400",
  };

  const priorityBarColors: Record<TicketPriorityType, string> = {
    URGENT: "bg-rose-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-indigo-500",
    LOW: "bg-slate-400",
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-6 dark:bg-slate-950">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Active Queue
            </span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {summary.openTickets +
              summary.inProgressTickets +
              summary.waitingTickets}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary.openTickets} Open • {summary.inProgressTickets} In Progress
            • {summary.unassignedTickets} Unassigned
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              SLA Compliance Rate
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {summary.slaComplianceRate}%
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-rose-500">
              <AlertOctagon className="h-3.5 w-3.5" />
              {summary.slaBreachedCount} Breached
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {summary.slaAtRiskCount} At Risk
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Avg First Response
            </span>
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {summary.avgFirstResponseMinutes}m
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Avg Resolution Time: {summary.avgResolutionHours}h
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Resolved &amp; Closed
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {summary.resolvedTickets + summary.closedTickets}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Out of {summary.totalTickets} total tickets tracked
          </p>
        </div>
      </div>

      {/* Distribution Breakdown Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Tickets by Lifecycle Status
            </h3>
          </div>
          <div className="space-y-3">
            {(Object.keys(STATUS_LABELS) as TicketStatusType[]).map((st) => {
              const count = byStatus[st] ?? 0;
              const pct =
                summary.totalTickets > 0
                  ? Math.round((count / summary.totalTickets) * 100)
                  : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {STATUS_LABELS[st]}
                    </span>
                    <span className="font-mono text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${statusBarColors[st]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Tickets by Priority Tier
            </h3>
          </div>
          <div className="space-y-3">
            {(Object.keys(PRIORITY_LABELS) as TicketPriorityType[]).map(
              (pr) => {
                const count = byPriority[pr] ?? 0;
                const pct =
                  summary.totalTickets > 0
                    ? Math.round((count / summary.totalTickets) * 100)
                    : 0;
                return (
                  <div key={pr} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {PRIORITY_LABELS[pr]}
                      </span>
                      <span className="font-mono text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${priorityBarColors[pr]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Volume by IT Category
            </h3>
          </div>
          <div className="space-y-2.5">
            {(Object.keys(CATEGORY_LABELS) as TicketCategoryType[]).map(
              (cat) => {
                const count = byCategory[cat] ?? 0;
                const pct =
                  summary.totalTickets > 0
                    ? Math.round((count / summary.totalTickets) * 100)
                    : 0;
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800/80 dark:bg-slate-950/50"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Agent Workload & Live Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {agentWorkload.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                Support Agent Workload &amp; Throughput
              </h3>
            </div>
            <div className="space-y-3">
              {agentWorkload.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={agent.name}
                      color={agent.avatarColor}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {agent.name}
                        </p>
                        <RoleBadge role={agent.role} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {agent.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right text-xs">
                    <div>
                      <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {agent.activeCount}
                      </p>
                      <p className="text-[10px] text-slate-500">Active</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {agent.resolvedCount}
                      </p>
                      <p className="text-[10px] text-slate-500">Resolved</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80 ${
            agentWorkload.length > 0 ? "lg:col-span-6" : "lg:col-span-12"
          }`}
        >
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Recent Helpdesk Activity Stream
            </h3>
          </div>
          <div className="space-y-2.5">
            {recentActivity.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => onSelectTicket(act.ticket.id)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-left text-xs transition hover:border-indigo-400 dark:border-slate-800/80 dark:bg-slate-950/40"
              >
                <div className="truncate pr-3">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {act.ticket.ticketNumber}
                  </span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.actor.name}
                  </span>{" "}
                  <span className="text-slate-500">
                    {act.action.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {act.newValue && (
                    <span className="ml-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      ({act.newValue})
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
