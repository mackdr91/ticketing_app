/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: In-memory server-side pub/sub event bus for real-time Server-Sent Events (SSE) broadcasts.
 */

export type RealtimeEventType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_DELETED"
  | "COMMENT_ADDED"
  | "ATTACHMENT_ADDED"
  | "NOTIFICATION_CREATED";

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  ticketId?: string;
  ticketNumber?: string;
  actorId?: string;
  targetUserIds?: string[];
  timestamp: string;
  summary?: string;
}

type RealtimeListener = (event: RealtimeEventPayload) => void;

class RealtimeEventBus {
  private listeners: Set<RealtimeListener> = new Set();

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public publish(
    event: Omit<RealtimeEventPayload, "timestamp">
  ): RealtimeEventPayload {
    const payload: RealtimeEventPayload = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (error: unknown) {
        console.error("[RealtimeEventBus] Listener error:", error);
      }
    }
    return payload;
  }
}

const globalForEventBus = globalThis as unknown as {
  realtimeEventBus: RealtimeEventBus | undefined;
};

export const realtimeEventBus: RealtimeEventBus =
  globalForEventBus.realtimeEventBus ?? new RealtimeEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.realtimeEventBus = realtimeEventBus;
}
