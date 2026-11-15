/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: User directory API route returning staff members for ticket assignment and full directory for admins.
 */

import { NextResponse } from "next/server";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const whereClause = isStaffRole(sessionUser.role)
      ? {}
      : { role: { in: ["ADMIN" as const, "AGENT" as const] } };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatarColor: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}
