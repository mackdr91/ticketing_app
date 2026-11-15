/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: REST API route for listing and posting public ticket comments and staff-only internal notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/ticket-queries";
import { realtimeEventBus } from "@/lib/events";

const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty.")
    .max(10000, "Comment cannot exceed 10,000 characters."),
  isInternal: z.boolean().optional().default(false),
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

    const { id: ticketId } = await context.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    if (!isStaff && ticket.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "You do not have permission to view this ticket's comments." },
        { status: 403 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: {
        ticketId,
        ...(isStaff ? {} : { isInternal: false }),
      },
      include: {
        author: { select: USER_SUMMARY_SELECT },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/tickets/[id]/comments] Error:", error);
    return NextResponse.json(
      { error: "Failed to load ticket comments." },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id: ticketId } = await context.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    if (!isStaff && ticket.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Forbidden: cannot comment on another user's ticket." },
        { status: 403 }
      );
    }

    const rawBody: unknown = await request.json();
    const parsed = createCommentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid comment payload.",
        },
        { status: 400 }
      );
    }

    if (!isStaff && parsed.data.isInternal) {
      return NextResponse.json(
        { error: "Customers cannot post staff-only internal notes." },
        { status: 403 }
      );
    }

    const isInternal = isStaff ? parsed.data.isInternal : false;
    const now = new Date();

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: sessionUser.id,
        body: parsed.data.body.trim(),
        isInternal,
      },
      include: {
        author: { select: USER_SUMMARY_SELECT },
      },
    });

    // Update ticket timestamps, status (if customer replied while WAITING_ON_CUSTOMER), and log activity
    const shouldRecordFirstResponse =
      isStaff && !isInternal && !ticket.firstRespondedAt;
    const shouldReopenWaitingTicket =
      !isStaff && ticket.status === TicketStatus.WAITING_ON_CUSTOMER;

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        updatedAt: now,
        ...(shouldRecordFirstResponse ? { firstRespondedAt: now } : {}),
        ...(shouldReopenWaitingTicket
          ? {
              status: ticket.assigneeId
                ? TicketStatus.IN_PROGRESS
                : TicketStatus.OPEN,
            }
          : {}),
        activities: {
          create: {
            actorId: sessionUser.id,
            action: isInternal ? "INTERNAL_NOTE_ADDED" : "COMMENTED",
            newValue: isInternal ? "Internal staff note" : "Public reply",
          },
        },
      },
    });

    // Dispatch notifications respecting internal note privacy
    const recipientIds = new Set<string>();
    if (isInternal) {
      if (ticket.assigneeId && ticket.assigneeId !== sessionUser.id) {
        recipientIds.add(ticket.assigneeId);
      } else {
        const staffMembers = await prisma.user.findMany({
          where: {
            role: { in: ["ADMIN", "AGENT"] },
            id: { not: sessionUser.id },
          },
          select: { id: true },
        });
        for (const staff of staffMembers) {
          recipientIds.add(staff.id);
        }
      }
    } else {
      if (ticket.requesterId !== sessionUser.id) {
        recipientIds.add(ticket.requesterId);
      }
      if (ticket.assigneeId && ticket.assigneeId !== sessionUser.id) {
        recipientIds.add(ticket.assigneeId);
      }
    }

    if (recipientIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(recipientIds).map((userId) => ({
          userId,
          ticketId: ticket.id,
          title: isInternal
            ? `Internal Note on ${ticket.ticketNumber}`
            : `New Reply on ${ticket.ticketNumber}`,
          message: `${sessionUser.name} posted on "${ticket.title}"`,
        })),
      });
    }

    realtimeEventBus.publish({
      type: "COMMENT_ADDED",
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      actorId: sessionUser.id,
      targetUserIds: isInternal ? Array.from(recipientIds) : undefined,
      summary: `${sessionUser.name} commented on ${ticket.ticketNumber}`,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/tickets/[id]/comments] Error:", error);
    return NextResponse.json(
      { error: "Failed to post comment." },
      { status: 500 }
    );
  }
}
