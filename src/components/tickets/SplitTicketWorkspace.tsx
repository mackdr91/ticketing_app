/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Linear/Zendesk-style split-pane ticket queue workspace with multi-facet filtering, responsive table, and instant detail inspector.
 */

"use client";

import React from "react";
import {
  Filter,
  Inbox,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  PRIORITY_LABELS,
  PriorityBadge,
  SlaBadge,
  StatusBadge,
  UserAvatar,
} from "@/components/ui/TicketBadges";
import { TicketDetailInspector } from "@/components/tickets/TicketDetailInspector";
import {
  SlaStateType,
  TicketCategoryType,
  TicketItem,
  TicketPriorityType,
  TicketStatusType,
  UserSummary,
} from "@/types/ticket";

export interface TicketFilters {
  search: string;
  status: TicketStatusType | "ALL";
  priority: TicketPriorityType | "ALL";
  category: TicketCategoryType | "ALL";
  slaState: SlaStateType | "ALL";
  assigneeId: string;
}

interface SplitTicketWorkspaceProps {
  tickets: TicketItem[];
  loading: boolean;
  selectedTicketId: string | null;
  onSelectTicket: (id: string | null) => void;
  filters: TicketFilters;
  onUpdateFilters: (next: Partial<TicketFilters>) => void;
  onResetFilters: () => void;
  currentUser: UserSummary;
  staffUsers: UserSummary[];
  refreshSignal: number;
  onTicketUpdated: () => void;
  onOpenCreateModal: () => void;
}

const STATUS_PILLS: Array<{ value: TicketStatusType | "ALL"; label: string }> =
  [
    { value: "ALL", label: "All Tickets" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "WAITING_ON_CUSTOMER", label: "Waiting" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
  ];

export function SplitTicketWorkspace({
  tickets,
  loading,
  selectedTicketId,
  onSelectTicket,
  filters,
  onUpdateFilters,
  onResetFilters,
  currentUser,
  staffUsers,
  refreshSignal,
  onTicketUpdated,
  onOpenCreateModal,
}: SplitTicketWorkspaceProps) {
  const isStaff =
    currentUser.role === "ADMIN" || currentUser.role === "AGENT";

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.category !== "ALL" ||
    filters.slaState !== "ALL" ||
    filters.assigneeId !== "ALL";

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Left Pane: Filterable Queue Table */}
      <div
        className={`flex h-full flex-col overflow-hidden transition-all ${
          selectedTicketId
            ? "w-full lg:w-[54%] xl:w-[56%]"
            : "w-full"
        }`}
      >
        {/* Top Filter & Search Bar */}
        <div className="space-y-3 border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => onUpdateFilters({ search: e.target.value })}
                placeholder="Search by Ticket ID (TKT-1001), title, description, or tag..."
                aria-label="Search tickets"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
              />
            </div>

            {/* Secondary Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 text-indigo-500" />
              </div>

              <select
                aria-label="Filter by Priority"
                value={filters.priority}
                onChange={(e) =>
                  onUpdateFilters({
                    priority: e.target.value as TicketPriorityType | "ALL",
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">All Priorities</option>
                {(Object.keys(PRIORITY_LABELS) as TicketPriorityType[]).map(
                  (pr) => (
                    <option key={pr} value={pr}>
                      {PRIORITY_LABELS[pr]}
                    </option>
                  )
                )}
              </select>

              <select
                aria-label="Filter by Category"
                value={filters.category}
                onChange={(e) =>
                  onUpdateFilters({
                    category: e.target.value as TicketCategoryType | "ALL",
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as TicketCategoryType[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>

              <select
                aria-label="Filter by SLA Status"
                value={filters.slaState}
                onChange={(e) =>
                  onUpdateFilters({
                    slaState: e.target.value as SlaStateType | "ALL",
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">All SLA States</option>
                <option value="BREACHED">SLA Breached</option>
                <option value="AT_RISK">SLA At Risk</option>
                <option value="ON_TRACK">SLA On Track</option>
                <option value="MET">SLA Met</option>
              </select>

              {isStaff && (
                <select
                  aria-label="Filter by Assignee"
                  value={filters.assigneeId}
                  onChange={(e) =>
                    onUpdateFilters({ assigneeId: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <option value="ALL">All Assignees</option>
                  <option value="ME">Assigned to Me</option>
                  <option value="UNASSIGNED">Unassigned Queue</option>
                  {staffUsers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Quick Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {STATUS_PILLS.map((pill) => {
                const active = filters.status === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => onUpdateFilters({ status: pill.value })}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </span>
          </div>
        </div>

        {/* Ticket Data Table (Responsive container-query table) */}
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="support-ticket-table-caption"
          className="table-wrapper flex-1 bg-slate-50/40 dark:bg-slate-950/40"
        >
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Loading helpdesk queue...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                No matching tickets found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Try clearing your search filters or create a new support ticket
                to get started.
              </p>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                <span>Create Ticket</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <caption id="support-ticket-table-caption" className="sr-only">
                Support ticket triage queue
              </caption>
              <thead className="border-b border-slate-200 bg-slate-100/95 text-[11px] font-semibold tracking-wider text-slate-500 uppercase backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    ID
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    Issue &amp; Category
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
                    Priority
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
                    SLA Timer
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    Assignee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {tickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id;
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50/90 dark:bg-indigo-950/40"
                          : "bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/90"
                      }`}
                    >
                      {/* Sticky Row Header */}
                      <th
                        scope="row"
                        className={`px-4 py-3 font-mono text-xs font-bold whitespace-nowrap ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400"
                        }`}
                      >
                        {ticket.ticketNumber}
                      </th>

                      {/* Title, Requester & Meta */}
                      <td className="max-w-md px-4 py-3">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {ticket.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {CATEGORY_LABELS[ticket.category]}
                          </span>
                          <span>•</span>
                          <span>{ticket.requester.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(ticket.createdAt)}</span>
                          {ticket._count.comments > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <MessageSquare className="h-3 w-3" />
                              {ticket._count.comments}
                            </span>
                          )}
                          {ticket._count.attachments > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <Paperclip className="h-3 w-3" />
                              {ticket._count.attachments}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <PriorityBadge priority={ticket.priority} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={ticket.status} />
                      </td>

                      {/* SLA Countdown */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <SlaBadge sla={ticket.sla} />
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ticket.assignee ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              name={ticket.assignee.name}
                              color={ticket.assignee.avatarColor}
                              size="xs"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {ticket.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400 dark:border-slate-700">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Pane: Split Ticket Detail Inspector */}
      {selectedTicketId && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-2xl shadow-2xl lg:static lg:z-auto lg:w-[46%] lg:max-w-none lg:shadow-none xl:w-[44%]">
          <TicketDetailInspector
            ticketId={selectedTicketId}
            currentUser={currentUser}
            staffUsers={staffUsers}
            refreshSignal={refreshSignal}
            onClose={() => onSelectTicket(null)}
            onTicketUpdated={onTicketUpdated}
          />
        </div>
      )}
    </div>
  );
}
