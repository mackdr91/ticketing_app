/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: SLA target calculation and live status evaluation engine for tickets.
 */

import { TicketPriority, TicketStatus } from "@prisma/client";

export type SlaState = "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET";

export interface SlaEvaluation {
  state: SlaState;
  dueAt: string;
  remainingMs: number;
  label: string;
  targetHours: number;
  percentElapsed: number;
}

/**
 * Target resolution window in hours per priority tier.
 */
export const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  URGENT: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

/**
 * Calculates the SLA due timestamp given a start date and ticket priority.
 */
export function calculateSlaDueDate(
  priority: TicketPriority,
  createdAt: Date = new Date()
): Date {
  const hours = SLA_HOURS_BY_PRIORITY[priority] ?? 24;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Formats a duration in milliseconds into a concise human-readable string (e.g. "2h 15m" or "1d 4h").
 */
export function formatDurationMs(durationMs: number): string {
  const absMs = Math.abs(durationMs);
  const totalMinutes = Math.max(1, Math.floor(absMs / (60 * 1000)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Evaluates the live SLA state and countdown label for a ticket.
 */
export function evaluateTicketSla(params: {
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  slaDueAt: Date;
  resolvedAt?: Date | null;
  now?: Date;
}): SlaEvaluation {
  const {
    priority,
    status,
    createdAt,
    slaDueAt,
    resolvedAt = null,
    now = new Date(),
  } = params;

  const targetHours = SLA_HOURS_BY_PRIORITY[priority] ?? 24;
  const totalWindowMs = Math.max(
    1,
    slaDueAt.getTime() - createdAt.getTime()
  );

  const isCompleted = status === "RESOLVED" || status === "CLOSED";

  if (isCompleted) {
    const completionDate = resolvedAt ?? now;
    const metSla = completionDate.getTime() <= slaDueAt.getTime();
    const elapsedMs = Math.max(
      0,
      completionDate.getTime() - createdAt.getTime()
    );
    return {
      state: metSla ? "MET" : "BREACHED",
      dueAt: slaDueAt.toISOString(),
      remainingMs: slaDueAt.getTime() - completionDate.getTime(),
      label: metSla
        ? `SLA Met (${formatDurationMs(elapsedMs)})`
        : `Resolved Late (+${formatDurationMs(completionDate.getTime() - slaDueAt.getTime())})`,
      targetHours,
      percentElapsed: Math.min(
        100,
        Math.round((elapsedMs / totalWindowMs) * 100)
      ),
    };
  }

  const remainingMs = slaDueAt.getTime() - now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
  const percentElapsed = Math.min(
    100,
    Math.round((elapsedMs / totalWindowMs) * 100)
  );

  if (remainingMs < 0) {
    return {
      state: "BREACHED",
      dueAt: slaDueAt.toISOString(),
      remainingMs,
      label: `Breached ${formatDurationMs(remainingMs)} ago`,
      targetHours,
      percentElapsed: 100,
    };
  }

  // At risk when 75% or more of the SLA window has elapsed (<= 25% remaining)
  const atRiskThresholdMs = totalWindowMs * 0.25;
  if (remainingMs <= atRiskThresholdMs) {
    return {
      state: "AT_RISK",
      dueAt: slaDueAt.toISOString(),
      remainingMs,
      label: `${formatDurationMs(remainingMs)} left`,
      targetHours,
      percentElapsed,
    };
  }

  return {
    state: "ON_TRACK",
    dueAt: slaDueAt.toISOString(),
    remainingMs,
    label: `${formatDurationMs(remainingMs)} left`,
    targetHours,
    percentElapsed,
  };
}
