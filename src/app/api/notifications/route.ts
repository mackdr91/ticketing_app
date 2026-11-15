/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: REST API route for retrieving user notifications and marking individual or all notifications as read.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const markNotificationsSchema = z.object({
  id: z.string().optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: sessionUser.id },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: sessionUser.id, isRead: false },
      }),
    ]);

    return NextResponse.json(
      { notifications, unreadCount },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = markNotificationsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid notification update payload." },
        { status: 400 }
      );
    }

    if (parsed.data.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: sessionUser.id, isRead: false },
        data: { isRead: true },
      });
    } else if (parsed.data.id) {
      await prisma.notification.updateMany({
        where: { id: parsed.data.id, userId: sessionUser.id },
        data: { isRead: true },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: sessionUser.id, isRead: false },
    });

    return NextResponse.json({ success: true, unreadCount }, { status: 200 });
  } catch (error: unknown) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications." },
      { status: 500 }
    );
  }
}
