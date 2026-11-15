/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: REST API route for listing/filtering tickets and creating new helpdesk tickets with SLA and RBAC enforcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  Prisma,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import {
  calculateSlaDueDate,
  evaluateTicketSla,
  SlaState,
} from "@/lib/sla";
import { realtimeEventBus } from "@/lib/events";
import { buildTicketListInclude } from "@/lib/ticket-queries";

const createTicketSchema = z.object({
  title: z
    .string()
    .min(4, "Title must be at least 4 characters.")
    .max(160, "Title cannot exceed 160 characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(10000),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  category: z.nativeEnum(TicketCategory).default(TicketCategory.GENERAL),
  tags: z.array(z.string().min(1).max(32)).max(8).optional().default([]),
  assigneeId: z.string().nullable().optional(),
});

/**
 * Generates the next sequential ticket number (e.g. TKT-1009).
 */
async function generateNextTicketNumber(): Promise<string> {
  const latestTicket = await prisma.ticket.findFirst({
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });

  if (!latestTicket) {
    return "TKT-1001";
  }

  const allNumbers = await prisma.ticket.findMany({
    select: { ticketNumber: true },
  });

  let maxNum = 1000;
  for (const item of allNumbers) {
    const match = /^TKT-(\d+)$/.exec(item.ticketNumber);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }

  return `TKT-${maxNum + 1}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const categoryParam = searchParams.get("category");
    const assigneeParam = searchParams.get("assigneeId");
    const slaStateParam = searchParams.get("slaState") as SlaState | null;
    const searchParam = searchParams.get("search")?.trim();

    const where: Prisma.TicketWhereInput = {};

    // Role-based visibility: Customers only see their own requested tickets
    if (!isStaffRole(sessionUser.role)) {
      where.requesterId = sessionUser.id;
    }

    if (
      statusParam &&
      statusParam !== "ALL" &&
      Object.values(TicketStatus).includes(statusParam as TicketStatus)
    ) {
      where.status = statusParam as TicketStatus;
    }

    if (
      priorityParam &&
      priorityParam !== "ALL" &&
      Object.values(TicketPriority).includes(priorityParam as TicketPriority)
    ) {
      where.priority = priorityParam as TicketPriority;
    }

    if (
      categoryParam &&
      categoryParam !== "ALL" &&
      Object.values(TicketCategory).includes(categoryParam as TicketCategory)
    ) {
      where.category = categoryParam as TicketCategory;
    }

    if (assigneeParam && assigneeParam !== "ALL") {
      if (assigneeParam === "UNASSIGNED") {
        where.assigneeId = null;
      } else if (assigneeParam === "ME") {
        where.assigneeId = sessionUser.id;
      } else {
        where.assigneeId = assigneeParam;
      }
    }

    if (searchParam) {
      where.OR = [
        { ticketNumber: { contains: searchParam, mode: "insensitive" } },
        { title: { contains: searchParam, mode: "insensitive" } },
        { description: { contains: searchParam, mode: "insensitive" } },
        { tags: { has: searchParam.toLowerCase() } },
      ];
    }

    const rawTickets = await prisma.ticket.findMany({
      where,
      include: buildTicketListInclude(isStaffRole(sessionUser.role)),
      orderBy: [{ createdAt: "desc" }],
    });

    const now = new Date();
    const enrichedTickets = rawTickets
      .map((ticket) => {
        const sla = evaluateTicketSla({
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          slaDueAt: ticket.slaDueAt,
          resolvedAt: ticket.resolvedAt,
          now,
        });
        return {
          ...ticket,
          sla,
        };
      })
      .filter((ticket) => {
        if (!slaStateParam || (slaStateParam as string) === "ALL") {
          return true;
        }
        return ticket.sla.state === slaStateParam;
      });

    return NextResponse.json({ tickets: enrichedTickets }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/tickets] Error:", error);
    return NextResponse.json(
      { error: "Failed to load tickets." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid ticket input data.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const ticketNumber = await generateNextTicketNumber();
    const slaDueAt = calculateSlaDueDate(parsed.data.priority, now);

    const sanitizedTags = Array.from(
      new Set(
        parsed.data.tags
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    );

    const assigneeId =
      isStaffRole(sessionUser.role) && parsed.data.assigneeId
        ? parsed.data.assigneeId
        : null;

    const createdTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        priority: parsed.data.priority,
        category: parsed.data.category,
        tags: sanitizedTags,
        slaDueAt,
        requesterId: sessionUser.id,
        assigneeId,
        activities: {
          create: {
            actorId: sessionUser.id,
            action: "CREATED",
            newValue: `${ticketNumber} (${parsed.data.priority})`,
          },
        },
      },
      include: buildTicketListInclude(isStaffRole(sessionUser.role)),
    });

    // Notify staff members (or assigned agent) about the new ticket
    const staffRecipients = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "AGENT"] },
        id: { not: sessionUser.id },
      },
      select: { id: true },
    });

    if (staffRecipients.length > 0) {
      await prisma.notification.createMany({
        data: staffRecipients.map((staff) => ({
          userId: staff.id,
          ticketId: createdTicket.id,
          title: `New ${createdTicket.priority} Ticket: ${createdTicket.ticketNumber}`,
          message: `${sessionUser.name} submitted "${createdTicket.title}"`,
        })),
      });
    }

    realtimeEventBus.publish({
      type: "TICKET_CREATED",
      ticketId: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber,
      actorId: sessionUser.id,
      summary: `${createdTicket.ticketNumber}: ${createdTicket.title}`,
    });

    const sla = evaluateTicketSla({
      priority: createdTicket.priority,
      status: createdTicket.status,
      createdAt: createdTicket.createdAt,
      slaDueAt: createdTicket.slaDueAt,
      resolvedAt: createdTicket.resolvedAt,
      now,
    });

    return NextResponse.json(
      {
        ticket: {
          ...createdTicket,
          sla,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/tickets] Error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket." },
      { status: 500 }
    );
  }
}
