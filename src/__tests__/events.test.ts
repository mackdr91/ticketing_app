/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Unit tests for the server-side real-time pub/sub event bus.
 */

import { describe, expect, it, vi } from "vitest";
import { realtimeEventBus, RealtimeEventPayload } from "@/lib/events";

describe("RealtimeEventBus (src/lib/events.ts)", () => {
  it("delivers published events to active subscribers and cleans up on unsubscribe", () => {
    const listener = vi.fn<(event: RealtimeEventPayload) => void>();
    const unsubscribe = realtimeEventBus.subscribe(listener);

    const published = realtimeEventBus.publish({
      type: "TICKET_CREATED",
      ticketId: "tkt-123",
      ticketNumber: "TKT-1008",
      summary: "TKT-1008: VPN connectivity issue",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(published);
    expect(published.ticketNumber).toBe("TKT-1008");

    unsubscribe();

    realtimeEventBus.publish({
      type: "COMMENT_ADDED",
      ticketId: "tkt-123",
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
