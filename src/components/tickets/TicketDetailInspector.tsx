/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Split-pane ticket detail inspector featuring SLA countdown bar, metadata controls, file attachment uploader, audit history, and public/internal threaded comments.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  History,
  Lock,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  PRIORITY_LABELS,
  PriorityBadge,
  RoleBadge,
  SlaBadge,
  STATUS_LABELS,
  StatusBadge,
  UserAvatar,
} from "@/components/ui/TicketBadges";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  TicketCategoryType,
  TicketDetail,
  TicketPriorityType,
  TicketStatusType,
  UserSummary,
} from "@/types/ticket";

interface TicketDetailInspectorProps {
  ticketId: string;
  currentUser: UserSummary;
  staffUsers: UserSummary[];
  refreshSignal: number;
  onClose: () => void;
  onTicketUpdated: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function TicketDetailInspector({
  ticketId,
  currentUser,
  staffUsers,
  refreshSignal,
  onClose,
  onTicketUpdated,
}: TicketDetailInspectorProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState(false);

  // Comment composer state
  const [commentBody, setCommentBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [previewComment, setPreviewComment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isStaff =
    currentUser.role === "ADMIN" || currentUser.role === "AGENT";

  const fetchDetail = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      const data = (await response.json()) as {
        ticket?: TicketDetail;
        error?: string;
      };
      if (!response.ok || !data.ticket) {
        setError(data.error ?? "Failed to load ticket details.");
        return;
      }
      setTicket(data.ticket);
      setError(null);
    } catch {
      setError("Network error while loading ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    void fetchDetail();
  }, [fetchDetail, refreshSignal]);

  async function handlePatchTicket(
    updates: Partial<{
      status: TicketStatusType;
      priority: TicketPriorityType;
      category: TicketCategoryType;
      assigneeId: string | null;
    }>
  ) {
    if (!ticket) return;
    setUpdatingField(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as {
        ticket?: TicketDetail;
        error?: string;
      };
      if (response.ok && data.ticket) {
        setTicket(data.ticket);
        onTicketUpdated();
      } else {
        setError(data.error ?? "Failed to update ticket.");
      }
    } catch {
      setError("Network error while updating ticket.");
    } finally {
      setUpdatingField(false);
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || !commentBody.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody.trim(),
          isInternal: isStaff ? isInternalNote : false,
        }),
      });

      if (response.ok) {
        setCommentBody("");
        setPreviewComment(false);
        await fetchDetail();
        onTicketUpdated();
      } else {
        const errData = (await response.json()) as { error?: string };
        setError(errData.error ?? "Failed to post comment.");
      }
    } catch {
      setError("Network error while posting comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    setUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/tickets/${ticket.id}/attachments`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setUploadError(data.error ?? "Failed to upload file.");
      } else {
        await fetchDetail();
        onTicketUpdated();
      }
    } catch {
      setUploadError("Network error while uploading attachment.");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  }

  async function handleDeleteTicket() {
    if (!ticket) return;
    const response = await fetch(`/api/tickets/${ticket.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      onTicketUpdated();
      onClose();
    }
  }

  if (loading && !ticket) {
    return (
      <aside className="flex h-full flex-col justify-center border-l border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Loading ticket inspector...
        </p>
      </aside>
    );
  }

  if (!ticket) {
    return (
      <aside className="flex h-full flex-col items-center justify-center border-l border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-rose-500">{error ?? "Ticket not found."}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
        >
          Close Inspector
        </button>
      </aside>
    );
  }

  const slaBarColor =
    ticket.sla.state === "BREACHED"
      ? "bg-rose-500"
      : ticket.sla.state === "AT_RISK"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <aside
      aria-label={`Ticket ${ticket.ticketNumber} inspector`}
      className="flex h-full flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Top Sticky Inspector Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-indigo-500/10 px-2 py-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {ticket.ticketNumber}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <SlaBadge sla={ticket.sla} />
        </div>

        <div className="flex items-center gap-1.5">
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (
            <button
              type="button"
              disabled={updatingField}
              onClick={() => handlePatchTicket({ status: "RESOLVED" })}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Resolve</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={updatingField}
              onClick={() => handlePatchTicket({ status: "IN_PROGRESS" })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reopen</span>
            </button>
          )}

          {(currentUser.role === "ADMIN" ||
            (ticket.requesterId === currentUser.id &&
              ticket.status === "OPEN")) && (
            <button
              type="button"
              onClick={handleDeleteTicket}
              title="Delete ticket"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket inspector"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Title & Requester Info */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {ticket.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <UserAvatar
                name={ticket.requester.name}
                color={ticket.requester.avatarColor}
                size="xs"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {ticket.requester.name}
              </span>
              <span>({ticket.requester.department})</span>
            </div>
            <span>•</span>
            <span>Opened {formatRelativeTime(ticket.createdAt)}</span>
            {ticket.firstRespondedAt && (
              <>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  First response {formatRelativeTime(ticket.firstRespondedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* SLA Progress Tracker Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              SLA Target ({ticket.sla.targetHours}h window for{" "}
              {PRIORITY_LABELS[ticket.priority]} priority)
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              Due {new Date(ticket.sla.dueAt).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${slaBarColor}`}
              style={{ width: `${ticket.sla.percentElapsed}%` }}
            />
          </div>
        </div>

        {/* Metadata Controls Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950/40">
          {/* Status Control */}
          <div>
            <label
              htmlFor="inspector-status"
              className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Status
            </label>
            <select
              id="inspector-status"
              disabled={updatingField}
              value={ticket.status}
              onChange={(e) =>
                handlePatchTicket({
                  status: e.target.value as TicketStatusType,
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {(Object.keys(STATUS_LABELS) as TicketStatusType[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Control */}
          <div>
            <label
              htmlFor="inspector-priority"
              className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Priority
            </label>
            <select
              id="inspector-priority"
              disabled={!isStaff || updatingField}
              value={ticket.priority}
              onChange={(e) =>
                handlePatchTicket({
                  priority: e.target.value as TicketPriorityType,
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {(Object.keys(PRIORITY_LABELS) as TicketPriorityType[]).map(
                (pr) => (
                  <option key={pr} value={pr}>
                    {PRIORITY_LABELS[pr]}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Category Control */}
          <div>
            <label
              htmlFor="inspector-category"
              className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
            >
              Category
            </label>
            <select
              id="inspector-category"
              disabled={updatingField}
              value={ticket.category}
              onChange={(e) =>
                handlePatchTicket({
                  category: e.target.value as TicketCategoryType,
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {(Object.keys(CATEGORY_LABELS) as TicketCategoryType[]).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Assignee Control */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="inspector-assignee"
                className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
              >
                Assignee
              </label>
              {isStaff && ticket.assigneeId !== currentUser.id && (
                <button
                  type="button"
                  onClick={() =>
                    handlePatchTicket({ assigneeId: currentUser.id })
                  }
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <UserCheck className="h-3 w-3" />
                  Claim
                </button>
              )}
            </div>
            {isStaff ? (
              <select
                id="inspector-assignee"
                disabled={updatingField}
                value={ticket.assigneeId ?? ""}
                onChange={(e) =>
                  handlePatchTicket({
                    assigneeId: e.target.value ? e.target.value : null,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {ticket.assignee ? ticket.assignee.name : "Awaiting Triage"}
              </div>
            )}
          </div>
        </div>

        {/* Description Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Issue Description
            </span>
            {ticket.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {ticket.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Tag className="h-2.5 w-2.5 text-indigo-500" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <MarkdownRenderer content={ticket.description} />
        </div>

        {/* File Attachments Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                Attachments ({ticket.attachments.length})
              </h3>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploadingFile ? "Uploading..." : "Attach File"}</span>
              <input
                type="file"
                disabled={uploadingFile}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <p className="mb-2 text-xs text-rose-500">{uploadError}</p>
          )}

          {ticket.attachments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No diagnostic logs, screenshots, or documents attached yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {ticket.attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                    <div className="truncate">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {att.fileName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatBytes(att.fileSize)} • Uploaded by{" "}
                        {att.uploader.name}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/attachments/${att.id}`}
                    download={att.fileName}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Threaded Comments & Internal Staff Notes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Conversation &amp; Internal Notes ({ticket.comments.length})
            </h3>
          </div>

          {ticket.comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No comments yet. Start the conversation below.
            </div>
          ) : (
            <div className="space-y-3">
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-xl border p-3.5 ${
                    comment.isInternal
                      ? "border-amber-500/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-950/25"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={comment.author.name}
                        color={comment.author.avatarColor}
                        size="xs"
                      />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {comment.author.name}
                      </span>
                      <RoleBadge role={comment.author.role} />
                      {comment.isInternal && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                          <Lock className="h-2.5 w-2.5" />
                          INTERNAL STAFF NOTE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <MarkdownRenderer content={comment.body} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Activity Trail */}
        <div className="space-y-2.5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
              Audit Activity Log ({ticket.activities.length})
            </h3>
          </div>
          <ol className="space-y-1.5 pl-2">
            {ticket.activities.map((act) => (
              <li
                key={act.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.actor.name}
                  </span>{" "}
                  <span>
                    {act.action.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {act.oldValue && act.newValue ? (
                    <span className="ml-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      ({act.oldValue} → {act.newValue})
                    </span>
                  ) : act.newValue ? (
                    <span className="ml-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      ({act.newValue})
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Bottom Sticky Reply / Internal Note Composer */}
      <form
        onSubmit={handlePostComment}
        className="border-t border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/90"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                !isInternalNote
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Public Reply
            </button>

            {isStaff && (
              <button
                type="button"
                onClick={() => setIsInternalNote(true)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  isInternalNote
                    ? "bg-amber-500 text-slate-950"
                    : "text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
                }`}
              >
                <Lock className="h-3 w-3" />
                <span>Internal Staff Note</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPreviewComment((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-500 dark:text-slate-400"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{previewComment ? "Edit Markdown" : "Preview"}</span>
          </button>
        </div>

        {previewComment ? (
          <div className="min-h-[76px] rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            {commentBody.trim() ? (
              <MarkdownRenderer content={commentBody} />
            ) : (
              <p className="text-xs italic text-slate-400">
                Nothing to preview yet...
              </p>
            )}
          </div>
        ) : (
          <textarea
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder={
              isInternalNote
                ? "Write an internal staff-only note (hidden from customer)..."
                : "Write a Markdown reply (**bold**, `code`, lists)..."
            }
            className={`w-full rounded-lg border p-2.5 text-sm focus:outline-none ${
              isInternalNote
                ? "border-amber-500/50 bg-amber-50/40 text-slate-900 focus:border-amber-500 dark:bg-amber-950/20 dark:text-white"
                : "border-slate-300 bg-white text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            }`}
          />
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Supports Markdown (`code`, **bold**, ### headings, - lists)
          </span>
          <button
            type="submit"
            disabled={submittingComment || !commentBody.trim()}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-xs transition disabled:opacity-50 ${
              isInternalNote
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>
              {submittingComment
                ? "Posting..."
                : isInternalNote
                  ? "Add Internal Note"
                  : "Send Reply"}
            </span>
          </button>
        </div>
      </form>
    </aside>
  );
}
