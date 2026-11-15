/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Server-Sent Events (SSE) streaming endpoint pushing real-time ticket, comment, and notification updates.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { realtimeEventBus, RealtimeEventPayload } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();
  const isStaff = isStaffRole(sessionUser.role);

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (payload: RealtimeEventPayload | { type: "CONNECTED"; timestamp: string }) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // Stream already closed
        }
      };

      sendEvent({
        type: "CONNECTED",
        timestamp: new Date().toISOString(),
      });

      const unsubscribe = realtimeEventBus.subscribe((event) => {
        // Filter targeted events (e.g. internal notes) so customers never receive staff-only events
        if (
          event.targetUserIds &&
          event.targetUserIds.length > 0 &&
          !isStaff &&
          !event.targetUserIds.includes(sessionUser.id)
        ) {
          return;
        }
        sendEvent(event);
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore close error
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
