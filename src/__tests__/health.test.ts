/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Automated unit test verifying the health check endpoint for Phase 1 CI/CD verification.
 */

import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 OK with service metadata", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("pulsedesk-ticketing-app");
    expect(typeof payload.timestamp).toBe("string");
  });
});
