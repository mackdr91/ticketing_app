/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Reusable Prisma selection and inclusion builders for ticket queries with role-aware comment filtering.
 */

import { Prisma } from "@prisma/client";

export const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarColor: true,
} satisfies Prisma.UserSelect;

/**
 * Builds the Prisma include object for ticket list queries.
 */
export function buildTicketListInclude(isStaff: boolean): Prisma.TicketInclude {
  return {
    requester: { select: USER_SUMMARY_SELECT },
    assignee: { select: USER_SUMMARY_SELECT },
    _count: {
      select: {
        comments: isStaff ? true : { where: { isInternal: false } },
        attachments: true,
      },
    },
  };
}

/**
 * Builds the Prisma include object for full single-ticket detail queries.
 */
export function buildTicketDetailInclude(
  isStaff: boolean
): Prisma.TicketInclude {
  return {
    requester: { select: USER_SUMMARY_SELECT },
    assignee: { select: USER_SUMMARY_SELECT },
    comments: {
      where: isStaff ? {} : { isInternal: false },
      include: {
        author: { select: USER_SUMMARY_SELECT },
      },
      orderBy: { createdAt: "asc" },
    },
    attachments: {
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    },
    activities: {
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarColor: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    },
    _count: {
      select: {
        comments: isStaff ? true : { where: { isInternal: false } },
        attachments: true,
      },
    },
  };
}
