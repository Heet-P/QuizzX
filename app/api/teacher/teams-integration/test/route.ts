import { NextResponse } from "next/server";
import { requireApiTeacherOrAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decryptWebhookUrl } from "@/lib/teams-crypto";
import { sendTestMessage } from "@/lib/teams-publish";

// POST /api/teacher/teams-integration/test — sends a small Adaptive Card to
// the configured webhook so the teacher can confirm it lands in the right
// channel before relying on it for a real publish.
export async function POST() {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;

  const integration = await prisma.teamsIntegration.findUnique({ where: { ownerId: user.id }, select: { webhookUrlEnc: true } });
  if (!integration) {
    return NextResponse.json({ error: "No Teams channel is linked yet — paste a webhook URL and save it first." }, { status: 400 });
  }

  const webhookUrl = decryptWebhookUrl(integration.webhookUrlEnc);
  const result = await sendTestMessage(webhookUrl);

  await prisma.teamsIntegration.update({
    where: { ownerId: user.id },
    data: { lastTestedAt: new Date(), lastTestOk: result.ok },
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error || "Teams rejected the test message." }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
