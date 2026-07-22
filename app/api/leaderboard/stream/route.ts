import { requireApiUser } from "@/lib/api-auth";
import { subscribeToLeaderboard } from "@/lib/leaderboard-broadcast";

export const runtime = "nodejs";

// GET /api/leaderboard/stream?quizId=xxx — SSE feed, ported from
// LeaderboardController.streamLeaderboard. Same-origin means the Clerk
// session cookie rides along automatically — no `?token=` query workaround
// needed here, unlike v1's cross-origin setup (see hooks/useLeaderboardStream.ts).
// Only fans out within a single process (lib/leaderboard-broadcast.ts) — see
// that module's header comment for the multi-instance caveat.
export async function GET(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");
  if (!quizId) return new Response(JSON.stringify({ error: "quizId required" }), { status: 400 });

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  let unsubscribe: () => void;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // controller already closed; unsubscribe happens on cancel()
        }
      };

      unsubscribe = subscribeToLeaderboard(quizId, send);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);
    },
    cancel() {
      clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
