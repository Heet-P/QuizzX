import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET/PUT /api/admin/settings — ported from AdminController.getSettings/updateSettings.
export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, unknown> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const key: string | undefined = body?.key;
  if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });
  const value = body?.value ?? null;

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true, key, value });
}
