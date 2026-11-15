/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Unit tests for password hashing and stateless JWT session token signing and verification.
 */

import { describe, expect, it } from "vitest";
import {
  hashPassword,
   isStaffRole,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

describe("Authentication & RBAC Utilities (src/lib/auth.ts)", () => {
  it("hashes and verifies passwords accurately", async () => {
    const plain = "Password123!";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword!", hash)).toBe(false);
  });

  it("signs and verifies stateless JWT session tokens", async () => {
    const mockUser = {
      id: "usr-admin-1",
      email: "admin@pulsedesk.io",
      name: "Domonick Mack",
      role: "ADMIN" as const,
      department: "IT Operations",
      avatarColor: "indigo",
    };

    const token = await signSessionToken(mockUser);
    expect(typeof token).toBe("string");

    const verified = await verifySessionToken(token);
    expect(verified).toEqual(mockUser);

    const invalid = await verifySessionToken(`${token}tampered`);
    expect(invalid).toBeNull();
  });

  it("identifies staff roles (ADMIN and AGENT) vs CUSTOMER", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
    expect(isStaffRole("AGENT")).toBe(true);
    expect(isStaffRole("CUSTOMER")).toBe(false);
  });
});
