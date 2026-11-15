/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Session inspection API route returning the authenticated user, assignable staff directory, and demo role accounts.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();

    const staffUsers = user
      ? await prisma.user.findMany({
          where: {
            role: { in: ["ADMIN", "AGENT"] },
          },
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
      : [];

    const demoAccounts = [
      {
        email: "admin@pulsedesk.io",
        name: "Domonick Mack",
        role: "ADMIN",
        department: "IT Operations",
      },
      {
        email: "agent@pulsedesk.io",
        name: "Elena Rostova",
        role: "AGENT",
        department: "Cloud & Infrastructure",
      },
      {
        email: "customer@pulsedesk.io",
        name: "Sarah Jenkins",
        role: "CUSTOMER",
        department: "Finance & Ops",
      },
    ];

    return NextResponse.json(
      {
        user,
        staffUsers,
        demoAccounts,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/auth/me] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session state." },
      { status: 500 }
    );
  }
}
