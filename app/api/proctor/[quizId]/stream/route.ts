import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/proctor/:quizId/stream — SSE, polls submission_events every 3s
// since the last-seen timestamp. Ported from proctorRoutes.js (defined
// inline in v1 too, no separate controller).
export async function GET(_req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { quizId } = await params;

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      let lastTs = new Date(0);

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller already closed
        }
      };

      const poll = async () => {
        try {
          const events = await prisma.submissionEvent.findMany({
            where: { quizId, ts: { gt: lastTs } },
            orderBy: { ts: "asc" },
            include: { user: { select: { username: true } } },
          });
          if (events.length > 0) {
            lastTs = events[events.length - 1].ts;
            for (const ev of events) {
              send({ id: ev.id, username: ev.user?.username, event_type: ev.eventType, event_data: ev.eventData, ts: ev.ts });
            }
          }
        } catch (err) {
          console.error("[proctor poll]", err);
        }
      };

      poll();
      interval = setInterval(poll, 3000);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
