import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { User } from "./generated/prisma/client";

// Shared auth guards for Route Handlers. Every v1 protected route ran
// `authMiddleware` (any signed-in user) or additionally `adminMiddleware`
// (role==='admin') before its handler — these two helpers are the Next.js
// Route Handler equivalent, called at the top of each handler instead of
// centralized middleware (proxy.ts deliberately stays auth-logic-free, see
// MEMORY.md Section 4.2 — Clerk v7's own docs recommend resource-based auth
// over centralized path-matching).

export async function requireApiUser(): Promise<{ user: User; error: null } | { user: null; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireApiAdmin(): Promise<{ user: User; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await requireApiUser();
  if (error) return { user: null, error };
  if (user.role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { user, error: null };
}

export async function requireApiTeacherOrAdmin(): Promise<{ user: User; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await requireApiUser();
  if (error) return { user: null, error };
  if (user.role !== "admin" && user.role !== "teacher") {
    return { user: null, error: NextResponse.json({ error: "Teacher or admin access required" }, { status: 403 }) };
  }
  return { user, error: null };
}
