/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Interactive 5-column Kanban board supporting drag-and-drop status transitions, SLA badges, and split-pane ticket inspection.
 */

"use client";

import React, { useState } from "react";
import { ArrowRight, MessageSquare, Paperclip } from "lucide-react";
import {
  CATEGORY_LABELS,
  PriorityBadge,
  SlaBadge,
  STATUS_LABELS,
  UserAvatar,
} from "@/components/ui/TicketBadges";
import { TicketDetailInspector } from "@/components/tickets/TicketDetailInspector";
import { TicketItem, TicketStatusType, UserSummary } from "@/types/ticket";

interface KanbanBoardProps {
  tickets: TicketItem[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string | null) => void;
  currentUser: UserSummary;
  staffUsers: UserSummary[];
  refreshSignal: number;
  onTicketUpdated: () => void;
}

const KANBAN_COLUMNS: Array<{
  status: TicketStatusType;
  accent: string;
}> = [
  { status: "OPEN", accent: "bg-indigo-500" },
  { status: "IN_PROGRESS", accent: "bg-sky-500" },
  { status: "WAITING_ON_CUSTOMER", accent: "bg-amber-500" },
  { status: "RESOLVED", accent: "bg-emerald-500" },
  { status: "CLOSED", accent: "bg-slate-400" },
];

export function KanbanBoard({
  tickets,
  selectedTicketId,
  onSelectTicket,
  currentUser,
  staffUsers,
  refreshSignal,
  onTicketUpdated,
}: KanbanBoardProps) {
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] =
    useState<TicketStatusType | null>(null);

  async function moveTicketStatus(
    ticketId: string,
    targetStatus: TicketStatusType
  ) {
    const existing = tickets.find((t) => t.id === ticketId);
    if (!existing || existing.status === targetStatus) return;

    await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    });
    onTicketUpdated();
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Kanban Columns Scroll Area */}
      <div className="flex flex-1 gap-4 overflow-x-auto bg-slate-100/70 p-5 dark:bg-slate-950">
        {KANBAN_COLUMNS.map((col) => {
          const columnTickets = tickets.filter((t) => t.status === col.status);
          const isDropTarget = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                if (draggedTicketId) {
                  void moveTicketStatus(draggedTicketId, col.status);
                  setDraggedTicketId(null);
                }
              }}
              className={`flex h-full w-76 shrink-0 flex-col rounded-xl border transition ${
                isDropTarget
                  ? "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  : "border-slate-200/90 bg-slate-50/90 dark:border-slate-800/90 dark:bg-slate-900/60"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.accent}`} />
                  <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase dark:text-slate-200">
                    {STATUS_LABELS[col.status]}
                  </h3>
                </div>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {columnTickets.length}
                </span>
              </div>

              {/* Cards Stack */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {columnTickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id;
                  const nextColIdx =
                    KANBAN_COLUMNS.findIndex(
                      (c) => c.status === ticket.status
                    ) + 1;
                  const nextStatus = KANBAN_COLUMNS[nextColIdx]?.status;

                  return (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={() => setDraggedTicketId(ticket.id)}
                      onDragEnd={() => {
                        setDraggedTicketId(null);
                        setDragOverColumn(null);
                      }}
                      onClick={() => onSelectTicket(ticket.id)}
                      className={`group cursor-pointer rounded-xl border p-3.5 shadow-2xs transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30"
                          : "border-slate-200 bg-white hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {ticket.ticketNumber}
                        </span>
                        <PriorityBadge priority={ticket.priority} />
                      </div>

                      <h4 className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-slate-900 dark:text-white">
                        {ticket.title}
                      </h4>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <SlaBadge sla={ticket.sla} />
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {CATEGORY_LABELS[ticket.category]}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          {ticket.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <UserAvatar
                                name={ticket.assignee.name}
                                color={ticket.assignee.avatarColor}
                                size="xs"
                              />
                              <span className="max-w-[95px] truncate font-medium text-slate-700 dark:text-slate-300">
                                {ticket.assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-slate-400">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {ticket._count.comments > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" />
                              {ticket._count.comments}
                            </span>
                          )}
                          {ticket._count.attachments > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Paperclip className="h-3 w-3" />
                              {ticket._count.attachments}
                            </span>
                          )}
                          {nextStatus && (
                            <button
                              type="button"
                              title={`Move to ${STATUS_LABELS[nextStatus]}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void moveTicketStatus(ticket.id, nextStatus);
                              }}
                              className="rounded p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-indigo-500/10 hover:text-indigo-500"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Split Inspector Drawer when a Kanban card is selected */}
      {selectedTicketId && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-xl shadow-2xl lg:static lg:z-auto lg:w-[420px] xl:w-[480px]">
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
