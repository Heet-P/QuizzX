import "server-only";

// Posts a quiz's scores into a Microsoft Teams channel via a Workflows
// ("Post to a channel when a webhook request is received") webhook.
//
// Payload shape, success status, and size limit below are verified against
// current Microsoft docs/community sources (not assumed from memory):
// - Body must be {"type":"message","attachments":[{"contentType":
//   "application/vnd.microsoft.card.adaptive","content": <AdaptiveCard>}]}
//   with `Content-Type: application/json` (missing/wrong content-type -> 400).
// - Success is HTTP 202 Accepted (the flow runs async), not 200 — callers
//   must check `res.ok`, not a specific status code.
// - Hard cap of 28KB per message.
// - The newer Adaptive Card `Table` element needs schema v1.5, and Teams
//   mobile only reliably renders up to v1.2 (there are open rendering-bug
//   reports for Table in Teams specifically) — so the roster is built as a
//   stack of ColumnSets (supported since v1.0) instead, which renders
//   consistently as an aligned grid on every Teams client.
// - A single flow trigger throttles somewhere around ~4 requests/sec, so
//   multi-message batches are posted sequentially with a short delay, not
//   fired concurrently.

export interface RosterRow {
  name: string;
  studentId: string;
  score: number;
  total: number | null;
}

interface AdaptiveCardMessage {
  type: "message";
  attachments: [
    {
      contentType: "application/vnd.microsoft.card.adaptive";
      content: Record<string, unknown>;
    },
  ];
}

const CARD_VERSION = "1.4";
const MAX_MESSAGE_BYTES = 22_000; // conservative under Teams' 28KB hard cap
const MAX_MESSAGES = 5; // past this many chunks, send a summary + link instead
const POST_DELAY_MS = 400; // stay well clear of Power Automate's ~4 req/s throttling

function textBlock(text: string, opts: Record<string, unknown> = {}) {
  return { type: "TextBlock", text, wrap: true, ...opts };
}

function rowColumnSet(row: RosterRow) {
  const scoreText = row.total !== null ? `${row.score} / ${row.total}` : `${row.score}`;
  return {
    type: "ColumnSet",
    columns: [
      { type: "Column", width: 2, items: [textBlock(row.name)] },
      { type: "Column", width: 2, items: [textBlock(row.studentId, { isSubtle: true })] },
      { type: "Column", width: 1, items: [textBlock(scoreText, { horizontalAlignment: "right" })] },
    ],
  };
}

function buildHeaderRow() {
  return {
    type: "ColumnSet",
    style: "emphasis",
    columns: [
      { type: "Column", width: 2, items: [textBlock("Student", { weight: "bolder" })] },
      { type: "Column", width: 2, items: [textBlock("ID", { weight: "bolder" })] },
      { type: "Column", width: 1, items: [textBlock("Score", { weight: "bolder", horizontalAlignment: "right" })] },
    ],
  };
}

function buildCard(quizTitle: string, rows: RosterRow[], part?: { index: number; count: number }): Record<string, unknown> {
  const title = part && part.count > 1 ? `${quizTitle} — Scores (part ${part.index}/${part.count})` : `${quizTitle} — Scores`;
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: CARD_VERSION,
    body: [textBlock(title, { size: "medium", weight: "bolder" }), buildHeaderRow(), ...rows.map((r) => rowColumnSet(r))],
  };
}

function buildSummaryCard(quizTitle: string, rows: RosterRow[], resultsUrl: string): Record<string, unknown> {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const avg = rows.length > 0 ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length : 0;
  const top = sorted.slice(0, 10);
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: CARD_VERSION,
    body: [
      textBlock(`${quizTitle} — Scores`, { size: "medium", weight: "bolder" }),
      textBlock(
        `${rows.length} students completed this quiz — too many to list individually here. Average score: ${avg.toFixed(1)}. Top ${top.length} shown below; full results are in QuizzX.`,
        { wrap: true, isSubtle: true }
      ),
      buildHeaderRow(),
      ...top.map((r) => rowColumnSet(r)),
      {
        type: "ActionSet",
        actions: [{ type: "Action.OpenUrl", title: "View full results in QuizzX", url: resultsUrl }],
      },
    ],
  };
}

function toMessage(card: Record<string, unknown>): AdaptiveCardMessage {
  return {
    type: "message",
    attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }],
  };
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

/** Packs rows into as few messages as fit under MAX_MESSAGE_BYTES each. */
function chunkRows(quizTitle: string, rows: RosterRow[]): RosterRow[][] {
  const emptyCardBytes = byteLength(toMessage(buildCard(quizTitle, [], { index: 1, count: 9 })));
  const budgetPerMessage = Math.max(MAX_MESSAGE_BYTES - emptyCardBytes, 2000);

  const chunks: RosterRow[][] = [];
  let current: RosterRow[] = [];
  let currentBytes = 0;

  for (const row of rows) {
    const rowBytes = byteLength(rowColumnSet(row));
    if (current.length > 0 && currentBytes + rowBytes > budgetPerMessage) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(row);
    currentBytes += rowBytes;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export interface PublishResult {
  success: boolean;
  messagesSent: number;
  totalMessages: number;
  usedSummaryFallback: boolean;
  error?: string;
}

async function postMessage(webhookUrl: string, message: AdaptiveCardMessage): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (res.ok) return { ok: true, status: res.status };
    const bodyText = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: bodyText.slice(0, 300) || `Teams returned HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "Network error reaching Teams" };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Posts a quiz's roster to Teams, one line per student, formatted as an
 * aligned ColumnSet grid. Splits across multiple sequential messages if the
 * roster doesn't fit in one; if it's so large that would take more than
 * MAX_MESSAGES, posts a single summary card (top scorers + a link back into
 * QuizzX) instead of spamming the channel.
 */
export async function publishScoresToTeams(webhookUrl: string, quizTitle: string, rows: RosterRow[], resultsUrl: string): Promise<PublishResult> {
  const chunks = chunkRows(quizTitle, rows);

  const messages: AdaptiveCardMessage[] =
    chunks.length > MAX_MESSAGES
      ? [toMessage(buildSummaryCard(quizTitle, rows, resultsUrl))]
      : chunks.map((chunk, i) => toMessage(buildCard(quizTitle, chunk, chunks.length > 1 ? { index: i + 1, count: chunks.length } : undefined)));

  const usedSummaryFallback = chunks.length > MAX_MESSAGES;

  let sent = 0;
  for (const message of messages) {
    if (sent > 0) await sleep(POST_DELAY_MS);
    const result = await postMessage(webhookUrl, message);
    if (!result.ok) {
      return {
        success: false,
        messagesSent: sent,
        totalMessages: messages.length,
        usedSummaryFallback,
        error: sent > 0 ? `Posted ${sent} of ${messages.length} messages, then Teams rejected the next one: ${result.error}` : result.error,
      };
    }
    sent++;
  }

  return { success: true, messagesSent: sent, totalMessages: messages.length, usedSummaryFallback };
}

/** Sends a small test card so a teacher can confirm the webhook lands in the right channel. */
export async function sendTestMessage(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: CARD_VERSION,
    body: [
      textBlock("✅ QuizzX test message", { size: "medium", weight: "bolder" }),
      textBlock("This channel is correctly linked — quiz scores published from QuizzX will show up here.", { wrap: true, isSubtle: true }),
    ],
  };
  const result = await postMessage(webhookUrl, toMessage(card));
  return { ok: result.ok, error: result.error };
}
