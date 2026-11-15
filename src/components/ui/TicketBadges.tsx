/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Reusable Slate/Indigo UI badge and avatar components for ticket statuses, priorities, categories, and SLA timers.
 */

"use client";

import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Flame,
  Minus,
  ShieldAlert,
} from "lucide-react";
import {
  SlaInfo,
  TicketCategoryType,
  TicketPriorityType,
  TicketStatusType,
  UserRole,
} from "@/types/ticket";

export const STATUS_LABELS: Record<TicketStatusType, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_CUSTOMER: "Waiting on Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriorityType, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const CATEGORY_LABELS: Record<TicketCategoryType, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  NETWORK: "Network",
  ACCESS: "Access & IAM",
  BILLING: "Billing",
  GENERAL: "General",
};

export function StatusBadge({ status }: { status: TicketStatusType }) {
  const styles: Record<TicketStatusType, string> = {
    OPEN: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    IN_PROGRESS:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    WAITING_ON_CUSTOMER:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    RESOLVED:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    CLOSED:
      "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };

  const dotColors: Record<TicketStatusType, string> = {
    OPEN: "bg-indigo-500",
    IN_PROGRESS: "bg-sky-500",
    WAITING_ON_CUSTOMER: "bg-amber-500",
    RESOLVED: "bg-emerald-500",
    CLOSED: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriorityType }) {
  const config: Record<
    TicketPriorityType,
    { style: string; icon: React.ReactNode }
  > = {
    URGENT: {
      style:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      icon: <Flame className="h-3.5 w-3.5 text-rose-500" />,
    },
    HIGH: {
      style:
        "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      icon: <ArrowUp className="h-3.5 w-3.5 text-orange-500" />,
    },
    MEDIUM: {
      style:
        "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
      icon: <Minus className="h-3.5 w-3.5 text-indigo-500" />,
    },
    LOW: {
      style:
        "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
      icon: <ArrowDown className="h-3.5 w-3.5 text-slate-400" />,
    },
  };

  const current = config[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${current.style}`}
    >
      {current.icon}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function SlaBadge({ sla }: { sla: SlaInfo }) {
  if (sla.state === "BREACHED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-rose-700 dark:text-rose-300">
        <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
        {sla.label}
      </span>
    );
  }

  if (sla.state === "AT_RISK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        {sla.label}
      </span>
    );
  }

  if (sla.state === "MET") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        {sla.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
      <Clock className="h-3.5 w-3.5 text-indigo-500" />
      {sla.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    ADMIN:
      "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    AGENT:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    CUSTOMER:
      "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${styles[role]}`}
    >
      {role === "ADMIN" && <ShieldAlert className="h-2.5 w-2.5" />}
      {role}
    </span>
  );
}

export function UserAvatar({
  name,
  color = "indigo",
  size = "sm",
}: {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-600 text-white",
    emerald: "bg-emerald-600 text-white",
    cyan: "bg-cyan-600 text-white",
    amber: "bg-amber-600 text-white",
    rose: "bg-rose-600 text-white",
    violet: "bg-violet-600 text-white",
  };

  const sizeMap: Record<"xs" | "sm" | "md", string> = {
    xs: "h-5 w-5 text-[10px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold shadow-xs ${colorMap[color] ?? colorMap.indigo} ${sizeMap[size]}`}
      title={name}
    >
      {initials || "U"}
    </span>
  );
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return "Just now";
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
