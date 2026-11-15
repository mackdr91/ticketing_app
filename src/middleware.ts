/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Next.js Edge Middleware enforcing HS256 JWT session verification via native Web Crypto API.
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/me",
];

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function verifyHs256JwtEdge(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [headerB64, payloadB64, signatureB64] = parts as [
    string,
    string,
    string,
  ];
  const secret =
    process.env.JWT_SECRET ?? "pulsedesk-super-secret-jwt-signing-key-2026";

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = base64UrlToUint8Array(signatureB64);
  const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.buffer as ArrayBuffer,
    dataBytes
  );

  if (!isValid) {
    return false;
  }

  const payloadJson = new TextDecoder().decode(
    base64UrlToUint8Array(payloadB64)
  );
  const payload = JSON.parse(payloadJson) as { exp?: number };
  if (typeof payload.exp === "number" && Date.now() >= payload.exp * 1000) {
    return false;
  }

  return true;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  let token = request.cookies.get("pulsedesk_session")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  try {
    const valid = await verifyHs256JwtEdge(token);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired session token." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired session token." },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
