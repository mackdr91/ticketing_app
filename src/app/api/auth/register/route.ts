/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: User registration API route with Zod input validation, bcrypt password hashing, and session initiation.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128),
  department: z.string().min(2).max(60).optional(),
  role: z.nativeEnum(Role).optional(),
});

const AVATAR_COLORS = ["indigo", "emerald", "cyan", "amber", "rose", "violet"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid registration details.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const avatarColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ??
      "indigo";

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: parsed.data.name.trim(),
        passwordHash,
        role: parsed.data.role ?? Role.CUSTOMER,
        department: parsed.data.department?.trim() || "General",
        avatarColor,
      },
    });

    const sessionUser = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      role: createdUser.role,
      department: createdUser.department,
      avatarColor: createdUser.avatarColor,
    };

    const token = await signSessionToken(sessionUser);
    const response = NextResponse.json(
      { user: sessionUser, token },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIES === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
