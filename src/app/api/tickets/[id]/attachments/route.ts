/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: REST API route for uploading and listing file attachments on a ticket with size and MIME validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { realtimeEventBus } from "@/lib/events";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
];

function isAllowedMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id: ticketId } = await context.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    if (!isStaff && ticket.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Forbidden: cannot upload files to another user's ticket." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "No valid file provided in 'file' form field." },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file cannot be empty." },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 10 MB." },
        { status: 400 }
      );
    }

    const mimeType = fileEntry.type || "text/plain";
    if (!isAllowedMimeType(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${mimeType}). Allowed types: images, PDF, text/logs, JSON, CSV, Office documents, and ZIP.`,
        },
        { status: 400 }
      );
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
    await mkdir(uploadDir, { recursive: true });

    const safeOriginalName = sanitizeFileName(fileEntry.name || "attachment.txt");
    const uniqueStorageName = `${crypto.randomUUID()}-${safeOriginalName}`;
    const storagePath = path.join(uploadDir, uniqueStorageName);

    const arrayBuffer = await fileEntry.arrayBuffer();
    await writeFile(storagePath, Buffer.from(arrayBuffer));

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        uploaderId: sessionUser.id,
        fileName: fileEntry.name || safeOriginalName,
        mimeType,
        fileSize: fileEntry.size,
        storagePath: uniqueStorageName,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await prisma.ticketActivity.create({
      data: {
        ticketId,
        actorId: sessionUser.id,
        action: "ATTACHMENT_ADDED",
        newValue: attachment.fileName,
      },
    });

    realtimeEventBus.publish({
      type: "ATTACHMENT_ADDED",
      ticketId,
      ticketNumber: ticket.ticketNumber,
      actorId: sessionUser.id,
      summary: `${sessionUser.name} attached ${attachment.fileName}`,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/tickets/[id]/attachments] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment." },
      { status: 500 }
    );
  }
}
