import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/csv-response";

interface IntegrityRow {
  username: string;
  email: string;
  event_type: string;
  event_data: unknown;
  ts: Date;
  tab_strikes: number | null;
  score: number | null;
  submitted_at: Date | null;
}

// GET /api/admin/quizzes/:id/integrity — CSV integrity report, ported from
// AdminController.getIntegrityReport / AdminService.getIntegrityReport.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const rows = await prisma.$queryRaw<IntegrityRow[]>`
    SELECT u.username, u.email,
           se.event_type, se.event_data, se.ts,
           s.tab_strikes, s.score, s.submitted_at
    FROM submission_events se
    JOIN users u ON u.id = se.user_id
    LEFT JOIN submissions s ON s.user_id=se.user_id AND s.quiz_id=se.quiz_id AND s.status='completed'
    WHERE se.quiz_id=${id}::uuid
    ORDER BY u.username, se.ts
  `;

  const csvLines = ["Username,Email,Event,EventData,Timestamp,TabStrikes,Score,SubmittedAt"];
  for (const r of rows) {
    csvLines.push(
      [
        `"${r.username}"`,
        `"${r.email}"`,
        r.event_type,
        `"${JSON.stringify(r.event_data || {}).replace(/"/g, "'")}"`,
        r.ts ? new Date(r.ts).toISOString() : "",
        r.tab_strikes ?? "",
        r.score ?? "",
        r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
      ].join(",")
    );
  }

  const filename = `integrity_${id}_${new Date().toISOString().split("T")[0]}.csv`;
  return csvResponse([csvLines.join("\n")], filename);
}
