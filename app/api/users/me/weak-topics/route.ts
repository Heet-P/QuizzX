import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getWeakTopics } from "@/lib/dashboard-data";

// GET /api/users/me/weak-topics — ported from UserController.getWeakTopics.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const heatmap = await getWeakTopics(user.id);
  return NextResponse.json(heatmap);
}
