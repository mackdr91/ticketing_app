/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Authentication utilities for password hashing, stateless JWT signing/verification, and RBAC checks.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "pulsedesk_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  avatarColor: string;
}

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ?? "pulsedesk-super-secret-jwt-signing-key-2026";
  return new TextEncoder().encode(secret);
}

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a stateless JWT token for the authenticated user.
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    avatarColor: user.avatarColor,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

/**
 * Verifies a JWT session token and returns the decoded SessionUser payload or null.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
      department:
        typeof payload.department === "string"
          ? payload.department
          : "General",
      avatarColor:
        typeof payload.avatarColor === "string"
          ? payload.avatarColor
          : "indigo",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from HTTP-only cookie or Authorization header.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return null;
    }

    const decoded = await verifySessionToken(token);
    if (!decoded) {
      return null;
    }

    // Confirm user still exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatarColor: true,
      },
    });

    return dbUser ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the role is staff (ADMIN or AGENT).
 */
export function isStaffRole(role: Role): boolean {
  return role === "ADMIN" || role === "AGENT";
}
