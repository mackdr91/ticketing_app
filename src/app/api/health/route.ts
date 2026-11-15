/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Health check API route for Docker, CI/CD, and Railway service probes.
 */

import { NextResponse } from "next/server";

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json(
    {
      status: "ok",
      service: "pulsedesk-ticketing-app",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
