/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Authenticated file download API route streaming ticket attachments from storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaffRole } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
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

    const { id } = await context.params;
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            id: true,
            requesterId: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found." },
        { status: 404 }
      );
    }

    const isStaff = isStaffRole(sessionUser.role);
    if (!isStaff && attachment.ticket.requesterId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Forbidden: you do not have access to this attachment." },
        { status: 403 }
      );
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
    const safeFileName = path.basename(attachment.storagePath);
    const fullPath = path.join(uploadDir, safeFileName);

    const fileBuffer = await readFile(fullPath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(fileBuffer.byteLength),
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/attachments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Attachment file could not be read." },
      { status: 404 }
    );
  }
}
