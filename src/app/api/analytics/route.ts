/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Analytics and KPI aggregation API route computing ticket metrics, SLA compliance, response times, and agent workloads.
 */

import { NextResponse } from "next/server";
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { evaluateTicketSla } from "@/lib/sla";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    const ticketWhere = isStaff ? {} : { requesterId: sessionUser.id };

    const [tickets, staffMembers, recentActivity] = await Promise.all([
      prisma.ticket.findMany({
        where: ticketWhere,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
              department: true,
              avatarColor: true,
            },
          },
          requester: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      isStaff
        ? prisma.user.findMany({
            where: { role: { in: ["ADMIN", "AGENT"] } },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              department: true,
              avatarColor: true,
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      prisma.ticketActivity.findMany({
        where: isStaff
          ? {}
          : {
              ticket: { requesterId: sessionUser.id },
              action: { not: "INTERNAL_NOTE_ADDED" },
            },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              role: true,
              avatarColor: true,
            },
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    const now = new Date();

    const byStatus: Record<TicketStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_ON_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    const byPriority: Record<TicketPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    const byCategory: Record<TicketCategory, number> = {
      HARDWARE: 0,
      SOFTWARE: 0,
      NETWORK: 0,
      ACCESS: 0,
      BILLING: 0,
      GENERAL: 0,
    };

    let slaBreachedCount = 0;
    let slaAtRiskCount = 0;
    let slaMetOrOnTrackCount = 0;
    let unassignedCount = 0;

    let firstResponseTotalMinutes = 0;
    let firstResponseSamples = 0;

    let resolutionTotalHours = 0;
    let resolutionSamples = 0;

    for (const ticket of tickets) {
      byStatus[ticket.status] += 1;
      byPriority[ticket.priority] += 1;
      byCategory[ticket.category] += 1;

      if (!ticket.assigneeId) {
        unassignedCount += 1;
      }

      const sla = evaluateTicketSla({
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        slaDueAt: ticket.slaDueAt,
        resolvedAt: ticket.resolvedAt,
        now,
      });

      if (sla.state === "BREACHED") {
        slaBreachedCount += 1;
      } else if (sla.state === "AT_RISK") {
        slaAtRiskCount += 1;
        slaMetOrOnTrackCount += 1;
      } else {
        slaMetOrOnTrackCount += 1;
      }

      if (ticket.firstRespondedAt) {
        const diffMins = Math.max(
          1,
          (ticket.firstRespondedAt.getTime() - ticket.createdAt.getTime()) /
            (60 * 1000)
        );
        firstResponseTotalMinutes += diffMins;
        firstResponseSamples += 1;
      }

      if (ticket.resolvedAt) {
        const diffHours = Math.max(
          0.1,
          (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) /
            (60 * 60 * 1000)
        );
        resolutionTotalHours += diffHours;
        resolutionSamples += 1;
      }
    }

    const totalTickets = tickets.length;
    const slaComplianceRate =
      totalTickets > 0
        ? Math.round((slaMetOrOnTrackCount / totalTickets) * 100)
        : 100;

    const avgFirstResponseMinutes =
      firstResponseSamples > 0
        ? Math.round(firstResponseTotalMinutes / firstResponseSamples)
        : 0;

    const avgResolutionHours =
      resolutionSamples > 0
        ? Number((resolutionTotalHours / resolutionSamples).toFixed(1))
        : 0;

    const agentWorkload = staffMembers.map((staff) => {
      const assigned = tickets.filter((t) => t.assigneeId === staff.id);
      const activeCount = assigned.filter(
        (t) => t.status !== "RESOLVED" && t.status !== "CLOSED"
      ).length;
      const resolvedCount = assigned.filter(
        (t) => t.status === "RESOLVED" || t.status === "CLOSED"
      ).length;
      return {
        ...staff,
        activeCount,
        resolvedCount,
        totalAssigned: assigned.length,
      };
    });

    return NextResponse.json(
      {
        summary: {
          totalTickets,
          openTickets: byStatus.OPEN,
          inProgressTickets: byStatus.IN_PROGRESS,
          waitingTickets: byStatus.WAITING_ON_CUSTOMER,
          resolvedTickets: byStatus.RESOLVED,
          closedTickets: byStatus.CLOSED,
          unassignedTickets: unassignedCount,
          slaComplianceRate,
          slaBreachedCount,
          slaAtRiskCount,
          avgFirstResponseMinutes,
          avgResolutionHours,
        },
        byStatus,
        byPriority,
        byCategory,
        agentWorkload,
        recentActivity,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute analytics." },
      { status: 500 }
    );
  }
}
