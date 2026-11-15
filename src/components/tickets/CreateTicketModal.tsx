/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Accessible native <dialog> modal for creating new helpdesk tickets with Markdown preview, SLA target indicator, and file attachment upload.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock, Eye, Paperclip, Plus, Sparkles, X } from "lucide-react";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/components/ui/TicketBadges";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  TicketCategoryType,
  TicketItem,
  TicketPriorityType,
  UserSummary,
} from "@/types/ticket";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSummary;
  staffUsers: UserSummary[];
  onTicketCreated: (ticket: TicketItem) => void;
}

const SLA_TARGET_LABEL: Record<TicketPriorityType, string> = {
  URGENT: "2-Hour SLA Target Window",
  HIGH: "8-Hour SLA Target Window",
  MEDIUM: "24-Hour SLA Target Window",
  LOW: "72-Hour SLA Target Window",
};

export function CreateTicketModal({
  isOpen,
  onClose,
  currentUser,
  staffUsers,
  onTicketCreated,
}: CreateTicketModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriorityType>("MEDIUM");
  const [category, setCategory] = useState<TicketCategoryType>("SOFTWARE");
  const [tagsInput, setTagsInput] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStaff =
    currentUser.role === "ADMIN" || currentUser.role === "AGENT";

  // Open/close native <dialog> via showModal() / close() per modern-web-guidance: dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Reset returnValue on close & implement light-dismiss fallback where closedBy is unsupported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleClose);

    // Fallback for browsers without native <dialog closedby="any"> support
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (
        !("closedBy" in HTMLDialogElement.prototype) &&
        pressedOutside &&
        isOutside(e)
      ) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          tags,
          assigneeId: isStaff && assigneeId ? assigneeId : null,
        }),
      });

      const data = (await response.json()) as {
        ticket?: TicketItem;
        error?: string;
      };

      if (!response.ok || !data.ticket) {
        setError(data.error ?? "Failed to create ticket.");
        setSubmitting(false);
        return;
      }

      // If an initial file attachment was selected, upload it immediately
      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        await fetch(`/api/tickets/${data.ticket.id}/attachments`, {
          method: "POST",
          body: formData,
        });
      }

      // Reset form state
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setCategory("SOFTWARE");
      setTagsInput("");
      setAssigneeId("");
      setAttachmentFile(null);
      setPreviewMode(false);

      onTicketCreated(data.ticket);
      dialogRef.current?.close();
    } catch {
      setError("Network error while submitting ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-ticket-title"
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      className="m-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2
              id="create-ticket-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Submit New Support Ticket
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatically routed with priority SLA countdown tracking
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close modal"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="ticket-title"
            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Issue Summary / Title
          </label>
          <input
            id="ticket-title"
            type="text"
            required
            autoFocus
            minLength={4}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Okta SSO login failing for staging Kubernetes cluster"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="ticket-priority"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Priority Level
            </label>
            <select
              id="ticket-priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TicketPriorityType)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

          <div>
            <label
              htmlFor="ticket-category"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Category
            </label>
            <select
              id="ticket-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as TicketCategoryType)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

          <div>
            <label
              htmlFor="ticket-tags"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Tags (comma-separated)
            </label>
            <input
              id="ticket-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vpn, sso, macos"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {/* Live SLA Target Window Callout */}
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-300">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4 text-indigo-500" />
            <span>{SLA_TARGET_LABEL[priority]}</span>
          </div>
          {isStaff && (
            <div className="flex items-center gap-2">
              <label htmlFor="ticket-assignee" className="text-[11px]">
                Assign:
              </label>
              <select
                id="ticket-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="rounded border border-indigo-500/30 bg-white px-2 py-0.5 text-xs text-slate-900 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Markdown Description with Preview Toggle */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="ticket-description"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Detailed Description (Markdown supported)
            </label>
            <button
              type="button"
              onClick={() => setPreviewMode((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{previewMode ? "Edit Markdown" : "Preview Markdown"}</span>
            </button>
          </div>

          {previewMode ? (
            <div className="min-h-[130px] rounded-lg border border-slate-300 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-950">
              {description.trim() ? (
                <MarkdownRenderer content={description} />
              ) : (
                <p className="text-xs italic text-slate-400">
                  Nothing to preview yet...
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="ticket-description"
              required
              minLength={10}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                "### Steps to Reproduce\n- Describe what happened\n- Include any error codes or `commands`"
              }
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          )}
        </div>

        {/* Optional File Attachment */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3.5 py-2.5 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Paperclip className="h-4 w-4 text-indigo-500" />
            <span>
              {attachmentFile
                ? `Attached: ${attachmentFile.name}`
                : "Attach log file, screenshot, or PDF (Max 10 MB)"}
            </span>
          </div>
          <label className="cursor-pointer rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            Browse File
            <input
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{submitting ? "Submitting..." : "Create Ticket"}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
