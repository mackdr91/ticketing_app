/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Integration tests verifying ticket CRUD, role-based access control (RBAC), internal note privacy, and analytics aggregations.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "../../prisma/seed";
import { signSessionToken } from "@/lib/auth";
import { GET as listTickets, POST as createTicket } from "@/app/api/tickets/route";
import {
  GET as getTicketById,
  PATCH as updateTicketById,
} from "@/app/api/tickets/[id]/route";
import {
  GET as listComments,
  POST as createComment,
} from "@/app/api/tickets/[id]/comments/route";
import { GET as getAnalytics } from "@/app/api/analytics/route";

// Mock next/headers so getSessionUser() reads our injected Authorization Bearer token in tests
let activeBearerToken = "";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
  headers: async () => ({
    get: (name: string) =>
      name.toLowerCase() === "authorization" && activeBearerToken
        ? `Bearer ${activeBearerToken}`
        : null,
  }),
}));

describe("Tickets, Comments & Analytics API Integration", () => {
  let agentToken = "";
  let customerSarahToken = "";
  let customerSarahId = "";
  let agentElenaId = "";

  beforeAll(async () => {
    await seedDatabase();

    const agent = await prisma.user.findUniqueOrThrow({
      where: { email: "agent@pulsedesk.io" },
    });
    const sarah = await prisma.user.findUniqueOrThrow({
      where: { email: "customer@pulsedesk.io" },
    });

    agentElenaId = agent.id;
    customerSarahId = sarah.id;

    agentToken = await signSessionToken({
      id: agent.id,
      email: agent.email,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      avatarColor: agent.avatarColor,
    });

    customerSarahToken = await signSessionToken({
      id: sarah.id,
      email: sarah.email,
      name: sarah.name,
      role: sarah.role,
      department: sarah.department,
      avatarColor: sarah.avatarColor,
    });
  });

  it("enforces RBAC on GET /api/tickets so customers only see their own tickets while agents see all", async () => {
    // Customer request
    activeBearerToken = customerSarahToken;
    const customerReq = new NextRequest("http://localhost:3000/api/tickets");
    const customerRes = await listTickets(customerReq);
    expect(customerRes.status).toBe(200);
    const customerData = (await customerRes.json()) as {
      tickets: Array<{ requesterId: string }>;
    };
    expect(customerData.tickets.length).toBeGreaterThan(0);
    expect(
      customerData.tickets.every((t) => t.requesterId === customerSarahId)
    ).toBe(true);

    // Agent request
    activeBearerToken = agentToken;
    const agentReq = new NextRequest("http://localhost:3000/api/tickets");
    const agentRes = await listTickets(agentReq);
    expect(agentRes.status).toBe(200);
    const agentData = (await agentRes.json()) as {
      tickets: Array<{ requesterId: string }>;
    };
    expect(agentData.tickets.length).toBeGreaterThan(
      customerData.tickets.length
    );
  });

  it("creates a ticket, enforces internal note isolation, and tracks lifecycle transitions", async () => {
    // 1. Customer Sarah creates a new ticket
    activeBearerToken = customerSarahToken;
    const createReq = new NextRequest("http://localhost:3000/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        title: "VPN certificate renewal failing on macOS Sequoia",
        description: "Unable to renew corporate client certificate via MDM profile.",
        priority: "HIGH",
        category: "NETWORK",
        tags: ["vpn", "certificate"],
      }),
    });

    const createRes = await createTicket(createReq);
    expect(createRes.status).toBe(201);
    const { ticket: created } = (await createRes.json()) as {
      ticket: { id: string; ticketNumber: string; priority: string };
    };
    expect(created.ticketNumber).toMatch(/^TKT-\d+$/);

    // 2. Customer attempts to post an internal staff note -> 403 Forbidden
    const forbiddenCommentReq = new NextRequest(
      `http://localhost:3000/api/tickets/${created.id}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          body: "Trying to spoof internal note",
          isInternal: true,
        }),
      }
    );
    const forbiddenRes = await createComment(forbiddenCommentReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(forbiddenRes.status).toBe(403);

    // 3. Agent posts an internal note and a public reply
    activeBearerToken = agentToken;
    const internalNoteReq = new NextRequest(
      `http://localhost:3000/api/tickets/${created.id}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          body: "Internal Staff Note: Investigating SCEP responder logs.",
          isInternal: true,
        }),
      }
    );
    const internalNoteRes = await createComment(internalNoteReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(internalNoteRes.status).toBe(201);

    const publicReplyReq = new NextRequest(
      `http://localhost:3000/api/tickets/${created.id}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          body: "Hi Sarah, we are refreshing the MDM SCEP profile for your device now.",
          isInternal: false,
        }),
      }
    );
    const publicReplyRes = await createComment(publicReplyReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(publicReplyRes.status).toBe(201);

    // 4. Customer fetches comments -> only sees the public reply, NEVER the internal note
    activeBearerToken = customerSarahToken;
    const customerCommentsRes = await listComments(
      new NextRequest(`http://localhost:3000/api/tickets/${created.id}/comments`),
      { params: Promise.resolve({ id: created.id }) }
    );
    const customerCommentsData = (await customerCommentsRes.json()) as {
      comments: Array<{ isInternal: boolean; body: string }>;
    };
    expect(customerCommentsData.comments).toHaveLength(1);
    expect(customerCommentsData.comments[0]?.isInternal).toBe(false);

    // 5. Agent assigns and resolves the ticket
    activeBearerToken = agentToken;
    const patchReq = new NextRequest(
      `http://localhost:3000/api/tickets/${created.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "RESOLVED",
          assigneeId: agentElenaId,
        }),
      }
    );
    const patchRes = await updateTicketById(patchReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(patchRes.status).toBe(200);

    const detailRes = await getTicketById(
      new NextRequest(`http://localhost:3000/api/tickets/${created.id}`),
      { params: Promise.resolve({ id: created.id }) }
    );
    const detailData = (await detailRes.json()) as {
      ticket: {
        status: string;
        resolvedAt: string | null;
        firstRespondedAt: string | null;
        sla: { state: string };
      };
    };
    expect(detailData.ticket.status).toBe("RESOLVED");
    expect(detailData.ticket.resolvedAt).not.toBeNull();
    expect(detailData.ticket.firstRespondedAt).not.toBeNull();
    expect(detailData.ticket.sla.state).toBe("MET");
  });

  it("computes analytics KPIs accurately via GET /api/analytics", async () => {
    activeBearerToken = agentToken;
    const res = await getAnalytics();
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      summary: { totalTickets: number; slaComplianceRate: number };
      agentWorkload: unknown[];
    };
    expect(payload.summary.totalTickets).toBeGreaterThanOrEqual(7);
    expect(payload.summary.slaComplianceRate).toBeGreaterThanOrEqual(0);
    expect(payload.agentWorkload.length).toBeGreaterThan(0);
  });
});
