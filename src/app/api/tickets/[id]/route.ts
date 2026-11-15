/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: REST API route for viewing, updating, and deleting an individual ticket with audit trails and RBAC enforcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { calculateSlaDueDate, evaluateTicketSla } from "@/lib/sla";
import { realtimeEventBus } from "@/lib/events";
import { buildTicketDetailInclude } from "@/lib/ticket-queries";

const updateTicketSchema = z.object({
  title: z.string().min(4).max(160).optional(),
  description: z.string().min(10).max(10000).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string().min(1).max(32)).max(8).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const isStaff = isStaffRole(sessionUser.role);

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: buildTicketDetailInclude(isStaff),
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    if (!isStaff && ticket.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "You do not have permission to view this ticket." },
        { status: 403 }
      );
    }

    const sla = evaluateTicketSla({
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      slaDueAt: ticket.slaDueAt,
      resolvedAt: ticket.resolvedAt,
    });

    return NextResponse.json(
      {
        ticket: {
          ...ticket,
          sla,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/tickets/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to load ticket details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    if (!isStaff && existing.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Forbidden: cannot modify another user's ticket." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid ticket update data.",
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Customers cannot assign agents or escalate priority arbitrarily
    if (!isStaff) {
      if (updates.assigneeId !== undefined || updates.priority !== undefined) {
        return NextResponse.json(
          {
            error:
              "Only support staff can change ticket assignment or priority.",
          },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const activityEntries: Array<{
      actorId: string;
      action: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    let nextSlaDueAt = existing.slaDueAt;
    let nextFirstRespondedAt = existing.firstRespondedAt;
    let nextResolvedAt = existing.resolvedAt;

    if (updates.status && updates.status !== existing.status) {
      activityEntries.push({
        actorId: sessionUser.id,
        action: "STATUS_CHANGED",
        oldValue: existing.status,
        newValue: updates.status,
      });

      if (
        !existing.firstRespondedAt &&
        isStaff &&
        updates.status !== TicketStatus.OPEN
      ) {
        nextFirstRespondedAt = now;
      }

      if (
        updates.status === TicketStatus.RESOLVED ||
        updates.status === TicketStatus.CLOSED
      ) {
        nextResolvedAt = existing.resolvedAt ?? now;
      } else {
        nextResolvedAt = null;
      }
    }

    if (updates.priority && updates.priority !== existing.priority) {
      activityEntries.push({
        actorId: sessionUser.id,
        action: "PRIORITY_CHANGED",
        oldValue: existing.priority,
        newValue: updates.priority,
      });
      nextSlaDueAt = calculateSlaDueDate(updates.priority, existing.createdAt);
    }

    if (updates.category && updates.category !== existing.category) {
      activityEntries.push({
        actorId: sessionUser.id,
        action: "CATEGORY_CHANGED",
        oldValue: existing.category,
        newValue: updates.category,
      });
    }

    if (
      updates.assigneeId !== undefined &&
      updates.assigneeId !== existing.assigneeId
    ) {
      let newAssigneeName = "Unassigned";
      if (updates.assigneeId) {
        const assigneeUser = await prisma.user.findUnique({
          where: { id: updates.assigneeId },
          select: { name: true },
        });
        newAssigneeName = assigneeUser?.name ?? "Assigned Agent";
      }

      activityEntries.push({
        actorId: sessionUser.id,
        action: "ASSIGNED",
        oldValue: existing.assignee?.name ?? "Unassigned",
        newValue: newAssigneeName,
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(updates.title ? { title: updates.title.trim() } : {}),
        ...(updates.description
          ? { description: updates.description.trim() }
          : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.priority ? { priority: updates.priority } : {}),
        ...(updates.category ? { category: updates.category } : {}),
        ...(updates.assigneeId !== undefined
          ? { assigneeId: updates.assigneeId }
          : {}),
        ...(updates.tags
          ? {
              tags: Array.from(
                new Set(
                  updates.tags
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean)
                )
              ),
            }
          : {}),
        slaDueAt: nextSlaDueAt,
        firstRespondedAt: nextFirstRespondedAt,
        resolvedAt: nextResolvedAt,
        ...(activityEntries.length > 0
          ? {
              activities: {
                create: activityEntries,
              },
            }
          : {}),
      },
      include: buildTicketDetailInclude(isStaff),
    });

    // Notify requester and/or new assignee when changes occur
    const notificationTargets = new Set<string>();
    if (existing.requesterId !== sessionUser.id) {
      notificationTargets.add(existing.requesterId);
    }
    if (
      updatedTicket.assigneeId &&
      updatedTicket.assigneeId !== sessionUser.id
    ) {
      notificationTargets.add(updatedTicket.assigneeId);
    }

    if (notificationTargets.size > 0 && activityEntries.length > 0) {
      const summaryText = activityEntries
        .map((a) => `${a.action.replace("_", " ")}: ${a.newValue ?? ""}`)
        .join(", ");

      await prisma.notification.createMany({
        data: Array.from(notificationTargets).map((userId) => ({
          userId,
          ticketId: updatedTicket.id,
          title: `Ticket Updated: ${updatedTicket.ticketNumber}`,
          message: `${sessionUser.name} updated ${updatedTicket.ticketNumber} (${summaryText})`,
        })),
      });
    }

    realtimeEventBus.publish({
      type: "TICKET_UPDATED",
      ticketId: updatedTicket.id,
      ticketNumber: updatedTicket.ticketNumber,
      actorId: sessionUser.id,
      summary: `${updatedTicket.ticketNumber} updated by ${sessionUser.name}`,
    });

    const sla = evaluateTicketSla({
      priority: updatedTicket.priority,
      status: updatedTicket.status,
      createdAt: updatedTicket.createdAt,
      slaDueAt: updatedTicket.slaDueAt,
      resolvedAt: updatedTicket.resolvedAt,
      now,
    });

    return NextResponse.json(
      {
        ticket: {
          ...updatedTicket,
          sla,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[PATCH /api/tickets/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const canDelete =
      sessionUser.role === "ADMIN" ||
      (existing.requesterId === sessionUser.id &&
        existing.status === TicketStatus.OPEN);

    if (!canDelete) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete this ticket." },
        { status: 403 }
      );
    }

    await prisma.ticket.delete({
      where: { id },
    });

    realtimeEventBus.publish({
      type: "TICKET_DELETED",
      ticketId: id,
      ticketNumber: existing.ticketNumber,
      actorId: sessionUser.id,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("[DELETE /api/tickets/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket." },
      { status: 500 }
    );
  }
}
