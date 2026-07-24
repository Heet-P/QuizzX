import { NextResponse } from "next/server";
import { requireApiTeacherOrAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { encryptWebhookUrl } from "@/lib/teams-crypto";

// GET/PUT/DELETE /api/teacher/teams-integration — one Teams channel webhook
// per teacher/admin account (see prisma/schema.prisma's TeamsIntegration doc
// comment for why it's scoped to the account rather than a "class": there is
// no class entity in this schema). GET never returns the decrypted URL, not
// even a masked suffix — the spec requires it never reach the browser at all.

function isPlausibleWorkflowsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase().endsWith(".logic.azure.com");
  } catch {
    return false;
  }
}

export async function GET() {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;

  const integration = await prisma.teamsIntegration.findUnique({
    where: { ownerId: user.id },
    select: { label: true, updatedAt: true, lastTestedAt: true, lastTestOk: true },
  });

  return NextResponse.json({
    configured: !!integration,
    label: integration?.label ?? null,
    updatedAt: integration?.updatedAt ?? null,
    lastTestedAt: integration?.lastTestedAt ?? null,
    lastTestOk: integration?.lastTestOk ?? null,
  });
}

export async function PUT(req: Request) {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const webhookUrl: string | undefined = body?.webhookUrl?.trim();
  const label: string | undefined = body?.label?.trim() || undefined;

  if (!webhookUrl) return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
  if (!isPlausibleWorkflowsUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "That doesn't look like a Teams Workflows webhook URL — it should be an https://...logic.azure.com/... link copied from the workflow's details page." },
      { status: 400 }
    );
  }

  const webhookUrlEnc = encryptWebhookUrl(webhookUrl);

  await prisma.teamsIntegration.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, webhookUrlEnc, label },
    update: { webhookUrlEnc, label, updatedAt: new Date(), lastTestedAt: null, lastTestOk: null },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;

  await prisma.teamsIntegration.deleteMany({ where: { ownerId: user.id } });
  return NextResponse.json({ success: true });
}
