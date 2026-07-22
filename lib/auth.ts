import "server-only";
import { auth as clerkAuth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { Prisma } from "./generated/prisma/client";
import type { User } from "./generated/prisma/client";

// Next.js equivalent of the old server/src/middleware/authMiddleware.js
// (syncUserToDb). Every Server Component / Route Handler / Server Action that
// needs the current user calls this instead of re-deriving auth state itself.

function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function generateUniqueUserCode(username: string): Promise<string> {
  const baseName = username.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12).toLowerCase();
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${baseName}-${randomNum}`;
    const existing = await prisma.user.findUnique({ where: { userCode: candidate } });
    if (!existing) return candidate;
  }
  return `${baseName}-${Date.now().toString().slice(-6)}`;
}

/**
 * Resolves the signed-in Clerk session to a local `User` row, creating one on
 * first sign-in (mirrors syncUserToDb: lookup by clerk_id -> lookup by email
 * and backfill clerk_id -> create new row with a generated username/user_code).
 * Returns null when there is no signed-in session.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await clerkAuth();
  if (!clerkId) return null;

  const byClerkId = await prisma.user.findUnique({ where: { clerkId } });
  if (byClerkId) {
    let user = byClerkId;

    const adminEmails = adminEmailList();
    if (user.email && adminEmails.includes(user.email.toLowerCase()) && user.role !== "admin") {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
    }

    if (!user.userCode) {
      const userCode = await generateUniqueUserCode(user.username);
      user = await prisma.user.update({ where: { id: user.id }, data: { userCode } });
    }

    return user;
  }

  const clerkUser = await clerkCurrentUser();
  if (!clerkUser) return null;

  const email = (clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkId}@placeholder.com`).toLowerCase();
  const adminEmails = adminEmailList();
  const role = adminEmails.includes(email) ? "admin" : "user";

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    const newRole = role === "admin" ? "admin" : byEmail.role; // promote if needed, never demote
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkId, role: newRole },
    });
  }

  const baseName = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
  const initialUsername = `${baseName}_${clerkId.slice(-5)}`;
  let finalUsername = initialUsername;
  let counter = 0;
  while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
    counter++;
    finalUsername = `${initialUsername}_${counter}`;
  }

  const userCode = await generateUniqueUserCode(finalUsername);

  try {
    return await prisma.user.create({
      data: { clerkId, email, username: finalUsername, role, userCode },
    });
  } catch (err) {
    // Race: another request claimed the same username between our check and this insert.
    if (!isUniqueConstraintError(err)) throw err;
    finalUsername = `${finalUsername}_${Date.now().toString().slice(-4)}`;
    return prisma.user.create({
      data: { clerkId, email, username: finalUsername, role, userCode },
    });
  }
}

/** Throws (redirect handled by caller) when there is no signed-in user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
