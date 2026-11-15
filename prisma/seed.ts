/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Idempotent database seed script populating demo accounts, realistic helpdesk tickets, SLA windows, comments, internal notes, and notifications.
 */

import {
  PrismaClient,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hoursFromNow(hoursOffset: number): Date {
  return new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
}

export async function seedDatabase(): Promise<void> {
  const existingUsersCount = await prisma.user.count();
  if (existingUsersCount > 0) {
    console.log(
      `[Seed] Database already contains ${existingUsersCount} users. Skipping initial seed.`
    );
    return;
  }

  console.log("[Seed] Creating demo accounts and realistic helpdesk tickets...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@pulsedesk.io",
      name: "Domonick Mack",
      passwordHash,
      role: Role.ADMIN,
      department: "IT Operations",
      avatarColor: "indigo",
    },
  });

  const agentElena = await prisma.user.create({
    data: {
      email: "agent@pulsedesk.io",
      name: "Elena Rostova",
      passwordHash,
      role: Role.AGENT,
      department: "Cloud & Infrastructure",
      avatarColor: "emerald",
    },
  });

  const agentMarcus = await prisma.user.create({
    data: {
      email: "marcus@pulsedesk.io",
      name: "Marcus Vance",
      passwordHash,
      role: Role.AGENT,
      department: "Identity & Endpoint Security",
      avatarColor: "cyan",
    },
  });

  const customerSarah = await prisma.user.create({
    data: {
      email: "customer@pulsedesk.io",
      name: "Sarah Jenkins",
      passwordHash,
      role: Role.CUSTOMER,
      department: "Finance & Operations",
      avatarColor: "amber",
    },
  });

  const customerDavid = await prisma.user.create({
    data: {
      email: "david.chen@acme.org",
      name: "David Chen",
      passwordHash,
      role: Role.CUSTOMER,
      department: "Platform Engineering",
      avatarColor: "violet",
    },
  });

  // 1. URGENT Network Outage (AT_RISK SLA)
  const tkt1001 = await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1001",
      title: "Production VPN gateway dropping packets in US-East region",
      description:
        "### Issue Summary\nEngineers connecting through `vpn-useast-01.pulsedesk.internal` are experiencing **35% packet loss** and intermittent tunnel resets every 10 minutes.\n\n### Steps Observed\n- WireGuard handshake succeeds initially\n- Throughput drops to `0 Kbps` when accessing internal RDS staging cluster\n- Affecting 18 remote engineers on the release train",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.URGENT,
      category: TicketCategory.NETWORK,
      tags: ["vpn", "us-east", "production", "outage"],
      createdAt: hoursFromNow(-1.65),
      slaDueAt: hoursFromNow(0.35), // At risk (<25% of 2h window left)
      firstRespondedAt: hoursFromNow(-1.4),
      requesterId: customerDavid.id,
      assigneeId: agentElena.id,
      activities: {
        create: [
          {
            actorId: customerDavid.id,
            action: "CREATED",
            newValue: "TKT-1001 (URGENT)",
            createdAt: hoursFromNow(-1.65),
          },
          {
            actorId: agentElena.id,
            action: "ASSIGNED",
            oldValue: "Unassigned",
            newValue: "Elena Rostova",
            createdAt: hoursFromNow(-1.45),
          },
          {
            actorId: agentElena.id,
            action: "STATUS_CHANGED",
            oldValue: "OPEN",
            newValue: "IN_PROGRESS",
            createdAt: hoursFromNow(-1.4),
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: agentElena.id,
            body: "Hi David — I have reproduced the MTU fragmentation on `vpn-useast-01` and am shifting traffic to the secondary HA concentrator now.",
            isInternal: false,
            createdAt: hoursFromNow(-1.35),
          },
          {
            authorId: agentElena.id,
            body: "**Internal Note**: AWS Transit Gateway route table `rtb-09a8f1` had a stale blackhole route after the peering maintenance window. Rolling back Terraform state now.",
            isInternal: true,
            createdAt: hoursFromNow(-1.1),
          },
        ],
      },
    },
  });

  // 2. HIGH Priority SSO / Okta MFA Lockout (BREACHED SLA)
  const tkt1002 = await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1002",
      title: "SSO SAML assertion failure for NetSuite Financial close portal",
      description:
        "### Impact\nThe Finance team cannot sign into **NetSuite ERP** via Okta SSO during quarterly close.\n\n```\nError Code: SAML_RESPONSE_INVALID_SIGNATURE\nRecipient: https://system.netsuite.com/saml2/acs\n```\nPlease prioritize as our ledger lock deadline is today.",
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: TicketCategory.ACCESS,
      tags: ["sso", "okta", "netsuite", "finance"],
      createdAt: hoursFromNow(-9.5),
      slaDueAt: hoursFromNow(-1.5), // Breached 1.5h ago
      requesterId: customerSarah.id,
      assigneeId: agentMarcus.id,
      activities: {
        create: [
          {
            actorId: customerSarah.id,
            action: "CREATED",
            newValue: "TKT-1002 (HIGH)",
            createdAt: hoursFromNow(-9.5),
          },
          {
            actorId: admin.id,
            action: "ASSIGNED",
            oldValue: "Unassigned",
            newValue: "Marcus Vance",
            createdAt: hoursFromNow(-8.0),
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: customerSarah.id,
            body: "Following up — 6 analysts in Finance are currently blocked from submitting journal entries.",
            isInternal: false,
            createdAt: hoursFromNow(-3.0),
          },
          {
            authorId: admin.id,
            body: "**Internal Escalation**: @Marcus please rotate the X.509 signing certificate in Okta App Settings and upload the metadata XML to NetSuite immediately.",
            isInternal: true,
            createdAt: hoursFromNow(-2.0),
          },
        ],
      },
    },
  });

  // 3. MEDIUM Priority Hardware Replacement (WAITING_ON_CUSTOMER, ON_TRACK)
  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1003",
      title: "MacBook Pro M3 Max Thunderbolt ports not detecting external 5K displays",
      description:
        "My workstation (`ASSET-MBP-4419`) stopped outputting video over all three USB-C / Thunderbolt 4 ports after the macOS 15.3 point update.\n\n- Tested with two CalDigit TS4 docks and direct HDMI cable\n- Power delivery still works, display enumeration fails",
      status: TicketStatus.WAITING_ON_CUSTOMER,
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.HARDWARE,
      tags: ["macbook", "display", "thunderbolt", "hardware"],
      createdAt: hoursFromNow(-6.0),
      slaDueAt: hoursFromNow(18.0),
      firstRespondedAt: hoursFromNow(-4.5),
      requesterId: customerSarah.id,
      assigneeId: agentMarcus.id,
      activities: {
        create: [
          {
            actorId: customerSarah.id,
            action: "CREATED",
            newValue: "TKT-1003 (MEDIUM)",
            createdAt: hoursFromNow(-6.0),
          },
          {
            actorId: agentMarcus.id,
            action: "STATUS_CHANGED",
            oldValue: "OPEN",
            newValue: "WAITING_ON_CUSTOMER",
            createdAt: hoursFromNow(-4.5),
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: agentMarcus.id,
            body: "Hi Sarah! Could you please check **System Settings → Privacy & Security → Allow accessories to connect** and confirm if it is set to *Automatically When Unlocked*? If that doesn't resolve it, we have a loaner M3 Max ready at Desk 4B.",
            isInternal: false,
            createdAt: hoursFromNow(-4.5),
          },
        ],
      },
    },
  });

  // 4. HIGH Priority Software License / Docker Enterprise Seat (OPEN, Unassigned, ON_TRACK)
  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1004",
      title: "Provision 15 additional JetBrains All Products & Docker Business seats",
      description:
        "We have 15 new backend engineers starting next Monday in the Platform Engineering org and need seats allocated under cost center `CC-ENG-402`.",
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: TicketCategory.SOFTWARE,
      tags: ["licensing", "onboarding", "jetbrains", "docker"],
      createdAt: hoursFromNow(-2.0),
      slaDueAt: hoursFromNow(6.0),
      requesterId: customerDavid.id,
      assigneeId: null,
      activities: {
        create: [
          {
            actorId: customerDavid.id,
            action: "CREATED",
            newValue: "TKT-1004 (HIGH)",
            createdAt: hoursFromNow(-2.0),
          },
        ],
      },
    },
  });

  // 5. MEDIUM Priority Billing Invoice Discrepancy (IN_PROGRESS, ON_TRACK)
  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1005",
      title: "Duplicate annual charge on Enterprise Cloud Support tier invoice #INV-2026-884",
      description:
        "Invoice `#INV-2026-884` includes two line items for **Enterprise 24/7 SLA Support ($4,800/yr)**. Please issue a credit memo or updated statement for AP processing.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.BILLING,
      tags: ["invoice", "billing", "credit-memo"],
      createdAt: hoursFromNow(-10.0),
      slaDueAt: hoursFromNow(14.0),
      firstRespondedAt: hoursFromNow(-8.0),
      requesterId: customerSarah.id,
      assigneeId: admin.id,
      activities: {
        create: [
          {
            actorId: customerSarah.id,
            action: "CREATED",
            newValue: "TKT-1005 (MEDIUM)",
            createdAt: hoursFromNow(-10.0),
          },
          {
            actorId: admin.id,
            action: "STATUS_CHANGED",
            oldValue: "OPEN",
            newValue: "IN_PROGRESS",
            createdAt: hoursFromNow(-8.0),
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: admin.id,
            body: "Thanks for flagging this, Sarah. I verified the duplicate SKU in Stripe Billing and initiated credit memo `#CM-2026-109`.",
            isInternal: false,
            createdAt: hoursFromNow(-7.5),
          },
        ],
      },
    },
  });

  // 6. HIGH Priority Database Read-Replica Access (RESOLVED, SLA MET)
  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1006",
      title: "Grant read-only IAM role to analytics PostgreSQL replica for BI pipeline",
      description:
        "Need `rds_iam` read-only permissions granted to service principal `svc-metabase-prod` on `pg-analytics-replica-02`.",
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.HIGH,
      category: TicketCategory.ACCESS,
      tags: ["postgresql", "iam", "database", "analytics"],
      createdAt: hoursFromNow(-18.0),
      slaDueAt: hoursFromNow(-10.0),
      firstRespondedAt: hoursFromNow(-17.2),
      resolvedAt: hoursFromNow(-14.5), // Resolved in 3.5h (well within 8h SLA)
      requesterId: customerDavid.id,
      assigneeId: agentElena.id,
      activities: {
        create: [
          {
            actorId: customerDavid.id,
            action: "CREATED",
            newValue: "TKT-1006 (HIGH)",
            createdAt: hoursFromNow(-18.0),
          },
          {
            actorId: agentElena.id,
            action: "STATUS_CHANGED",
            oldValue: "OPEN",
            newValue: "RESOLVED",
            createdAt: hoursFromNow(-14.5),
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: agentElena.id,
            body: "Role `bi_readonly_role` has been granted `SELECT` on all tables in schema `public` and `analytics`, and linked to `svc-metabase-prod`.",
            isInternal: false,
            createdAt: hoursFromNow(-14.5),
          },
        ],
      },
    },
  });

  // 7. LOW Priority General Policy Question (CLOSED, SLA MET)
  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-1007",
      title: "Requesting SOC2 Type II report and penetration test attestation for vendor review",
      description:
        "Our enterprise compliance team needs the latest 2026 SOC2 Type II bridge letter and ISO 27001 certificate.",
      status: TicketStatus.CLOSED,
      priority: TicketPriority.LOW,
      category: TicketCategory.GENERAL,
      tags: ["compliance", "soc2", "security"],
      createdAt: hoursFromNow(-48.0),
      slaDueAt: hoursFromNow(24.0),
      firstRespondedAt: hoursFromNow(-45.0),
      resolvedAt: hoursFromNow(-40.0),
      requesterId: customerSarah.id,
      assigneeId: admin.id,
      activities: {
        create: [
          {
            actorId: customerSarah.id,
            action: "CREATED",
            newValue: "TKT-1007 (LOW)",
            createdAt: hoursFromNow(-48.0),
          },
          {
            actorId: admin.id,
            action: "STATUS_CHANGED",
            oldValue: "OPEN",
            newValue: "CLOSED",
            createdAt: hoursFromNow(-40.0),
          },
        ],
      },
    },
  });

  // Notifications for demo accounts
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        ticketId: tkt1002.id,
        title: "SLA Breach Alert: TKT-1002",
        message: "SSO SAML assertion failure for NetSuite has exceeded its 8h HIGH SLA target.",
        isRead: false,
      },
      {
        userId: agentElena.id,
        ticketId: tkt1001.id,
        title: "SLA At Risk: TKT-1001",
        message: "Production VPN gateway ticket has less than 25 minutes remaining before SLA breach.",
        isRead: false,
      },
      {
        userId: customerSarah.id,
        ticketId: tkt1002.id,
        title: "Agent Assigned to TKT-1002",
        message: "Marcus Vance has been assigned to investigate your Okta SSO ticket.",
        isRead: false,
      },
    ],
  });

  console.log("[Seed] Successfully seeded 5 users and 7 helpdesk tickets.");
}

const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("seed.ts");

if (isDirectExecution) {
  seedDatabase()
    .catch((error: unknown) => {
      console.error("[Seed] Fatal error during database seeding:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
