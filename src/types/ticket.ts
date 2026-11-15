/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Shared TypeScript interfaces for tickets, SLA evaluations, comments, attachments, notifications, and analytics.
 */

export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER";

export type TicketStatusType =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketCategoryType =
  | "HARDWARE"
  | "SOFTWARE"
  | "NETWORK"
  | "ACCESS"
  | "BILLING"
  | "GENERAL";

export type SlaStateType = "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  avatarColor: string;
}

export interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface SlaInfo {
  state: SlaStateType;
  dueAt: string;
  remainingMs: number;
  label: string;
  targetHours: number;
  percentElapsed: number;
}

export interface CommentItem {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: UserSummary;
}

export interface AttachmentItem {
  id: string;
  ticketId: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface TicketActivityItem {
  id: string;
  ticketId: string;
  actorId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
    avatarColor: string;
  };
}

export interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatusType;
  priority: TicketPriorityType;
  category: TicketCategoryType;
  tags: string[];
  slaDueAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  requesterId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  requester: UserSummary;
  assignee: UserSummary | null;
  sla: SlaInfo;
  _count: {
    comments: number;
    attachments: number;
  };
}

export interface TicketDetail extends TicketItem {
  comments: CommentItem[];
  attachments: AttachmentItem[];
  activities: TicketActivityItem[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  ticketId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    priority: TicketPriorityType;
    status: TicketStatusType;
  } | null;
}

export interface AnalyticsData {
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    unassignedTickets: number;
    slaComplianceRate: number;
    slaBreachedCount: number;
    slaAtRiskCount: number;
    avgFirstResponseMinutes: number;
    avgResolutionHours: number;
  };
  byStatus: Record<TicketStatusType, number>;
  byPriority: Record<TicketPriorityType, number>;
  byCategory: Record<TicketCategoryType, number>;
  agentWorkload: Array<
    UserSummary & {
      activeCount: number;
      resolvedCount: number;
      totalAssigned: number;
    }
  >;
  recentActivity: Array<
    TicketActivityItem & {
      ticket: {
        id: string;
        ticketNumber: string;
        title: string;
      };
    }
  >;
}
