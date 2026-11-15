/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Logout API route clearing the HTTP-only JWT session cookie.
 */

import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
