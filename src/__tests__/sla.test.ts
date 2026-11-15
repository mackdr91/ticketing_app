/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Unit tests for the SLA target calculation and live status evaluation engine.
 */

import { describe, expect, it } from "vitest";
import { calculateSlaDueDate, evaluateTicketSla } from "@/lib/sla";

describe("SLA Engine (src/lib/sla.ts)", () => {
  it("computes the correct SLA due date per priority level", () => {
    const start = new Date("2026-11-15T10:00:00.000Z");

    expect(calculateSlaDueDate("URGENT", start).toISOString()).toBe(
      "2026-11-15T12:00:00.000Z"
    );
    expect(calculateSlaDueDate("HIGH", start).toISOString()).toBe(
      "2026-11-15T18:00:00.000Z"
    );
    expect(calculateSlaDueDate("MEDIUM", start).toISOString()).toBe(
      "2026-11-16T10:00:00.000Z"
    );
    expect(calculateSlaDueDate("LOW", start).toISOString()).toBe(
      "2026-11-18T10:00:00.000Z"
    );
  });

  it("evaluates ON_TRACK, AT_RISK, BREACHED, and MET states accurately", () => {
    const createdAt = new Date("2026-11-15T10:00:00.000Z");
    const slaDueAt = calculateSlaDueDate("URGENT", createdAt); // 12:00:00Z (2h window)

    // 30 mins in -> ON_TRACK
    const onTrack = evaluateTicketSla({
      priority: "URGENT",
      status: "OPEN",
      createdAt,
      slaDueAt,
      now: new Date("2026-11-15T10:30:00.000Z"),
    });
    expect(onTrack.state).toBe("ON_TRACK");
    expect(onTrack.percentElapsed).toBe(25);

    // 1h 40m in (only 20m remaining out of 120m -> <= 25%) -> AT_RISK
    const atRisk = evaluateTicketSla({
      priority: "URGENT",
      status: "IN_PROGRESS",
      createdAt,
      slaDueAt,
      now: new Date("2026-11-15T11:40:00.000Z"),
    });
    expect(atRisk.state).toBe("AT_RISK");

    // 2h 30m in -> BREACHED
    const breached = evaluateTicketSla({
      priority: "URGENT",
      status: "OPEN",
      createdAt,
      slaDueAt,
      now: new Date("2026-11-15T12:30:00.000Z"),
    });
    expect(breached.state).toBe("BREACHED");
    expect(breached.label).toContain("Breached");

    // Resolved within window -> MET
    const met = evaluateTicketSla({
      priority: "URGENT",
      status: "RESOLVED",
      createdAt,
      slaDueAt,
      resolvedAt: new Date("2026-11-15T11:15:00.000Z"),
      now: new Date("2026-11-15T14:00:00.000Z"),
    });
    expect(met.state).toBe("MET");
    expect(met.label).toContain("SLA Met");
  });
});
