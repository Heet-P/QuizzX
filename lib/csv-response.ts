import "server-only";

// MIGRATION_AUDIT.md Section 9 flags near-identical CSV-building/response
// logic duplicated across LeaderboardController.exportLeaderboard and
// AdminController.getIntegrityReport in v1 — one shared helper here instead.
export function csvResponse(rows: string[], filename: string): Response {
  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Wraps a value in double quotes, escaping any embedded quotes — CSV field escaping. */
export function csvField(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
