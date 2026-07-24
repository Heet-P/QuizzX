import "server-only";
import { groq, GROQ_MODEL, stripFences } from "./ai-clients";
import type { QuizQuestion, QuestionType, MatchPair } from "@/types/quiz";

// New 2026-07-23 per explicit user request: classify each question in an
// uploaded quiz document into one of 4 types (mcq_single / mcq_multi /
// fill_blank / match_columns) and extract its type-appropriate answer(s),
// rather than assuming every question is single-correct MCQ like
// lib/quiz-parser.ts's regex parser does. Added as a NEW option alongside
// that parser, not a replacement (user decision 2026-07-23).
//
// Uses Groq's llama-3.3-70b-versatile (GROQ_MODEL), the same model already
// used for generateQuestions/format-quiz — not NVIDIA NIM's
// meta/llama-3.1-8b-instruct (NIM_MODEL). Reasoning: this task is a harder
// instruction-following job than NIM's other uses here (short streamed
// distractors/explanations) — it must classify into 4 different JSON shapes
// per question and stay faithful to the source document across a
// potentially long input, which the larger 70B model handles far more
// reliably than the 8B one. Both providers are free-tier for this project;
// picking the stronger free model for the harder job, not the cheaper one.

const MAX_DOC_CHARS = 15000;

interface RawParsedQuestion {
  type?: string;
  text?: string;
  question?: string;
  options?: unknown[];
  answer?: unknown;
  answers?: unknown[];
  pairs?: { left?: unknown; right?: unknown }[];
  explanation?: string;
  topic?: string;
}

const VALID_TYPES: QuestionType[] = ["mcq_single", "mcq_multi", "fill_blank", "match_columns"];

function coerceQuestion(raw: RawParsedQuestion): QuizQuestion | null {
  const text = String(raw.text || raw.question || "").trim();
  if (!text) return null;
  const explanation = raw.explanation ? String(raw.explanation).trim() : null;
  const topic = raw.topic ? String(raw.topic).trim() : null;
  const type: QuestionType = VALID_TYPES.includes(raw.type as QuestionType) ? (raw.type as QuestionType) : "mcq_single";

  switch (type) {
    case "mcq_single": {
      const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o).trim()).filter(Boolean) : [];
      const answer = String(raw.answer ?? "").trim();
      if (options.length < 2 || !answer || !options.includes(answer)) return null;
      return { type: "mcq_single", text, options, answer, explanation, topic };
    }
    case "mcq_multi": {
      const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o).trim()).filter(Boolean) : [];
      const answers = Array.isArray(raw.answers) ? raw.answers.map((a) => String(a).trim()).filter(Boolean) : [];
      if (options.length < 2 || answers.length === 0 || !answers.every((a) => options.includes(a))) return null;
      return { type: "mcq_multi", text, options, answers, explanation, topic };
    }
    case "fill_blank": {
      const answer = String(raw.answer ?? "").trim();
      if (!answer) return null;
      return { type: "fill_blank", text, answer, explanation, topic };
    }
    case "match_columns": {
      const pairs: MatchPair[] = Array.isArray(raw.pairs)
        ? raw.pairs
            .map((p) => ({ left: String(p?.left ?? "").trim(), right: String(p?.right ?? "").trim() }))
            .filter((p) => p.left && p.right)
        : [];
      if (pairs.length < 2) return null;
      return { type: "match_columns", text, pairs, explanation, topic };
    }
    default:
      // Unreachable today: VALID_TYPES only lists the 4 types this function
      // classifies into, so `type` is coerced to "mcq_single" for anything
      // else (see above) — this exists purely to satisfy TS exhaustiveness
      // now that QuestionType has grown a 5th member ("ordering", added
      // 2026-07-24) that this AI-classification path doesn't handle yet.
      return null;
  }
}

/**
 * Sends raw extracted document text to Groq and returns a classified,
 * type-appropriate QuizQuestion[]. Malformed/incomplete items from the model
 * are dropped rather than surfaced as broken questions (same defensive
 * filtering pattern as generateQuestions).
 */
export async function parseQuizDocumentWithAI(rawText: string): Promise<QuizQuestion[]> {
  const prompt = `You are extracting quiz questions from a document. Read the raw text below and identify every question. For EACH question, classify it into exactly one of these 4 types and output the matching JSON shape:

1. "mcq_single" — single correct answer from a list of options:
   {"type":"mcq_single","text":"<question>","options":["opt1","opt2",...],"answer":"<the correct option, copied exactly from options>","explanation":"<optional>","topic":"<optional>"}

2. "mcq_multi" — multiple correct answers from a list of options (question says "select all that apply" or has more than one correct option):
   {"type":"mcq_multi","text":"<question>","options":["opt1","opt2",...],"answers":["<correct option 1>","<correct option 2>"],"explanation":"<optional>","topic":"<optional>"}

3. "fill_blank" — a blank/short-answer question with one exact expected answer (no options given):
   {"type":"fill_blank","text":"<question with ___ for the blank>","answer":"<expected answer>","explanation":"<optional>","topic":"<optional>"}

4. "match_columns" — a "match the following" question pairing items from two columns:
   {"type":"match_columns","text":"<question, e.g. Match the following>","pairs":[{"left":"<item>","right":"<its correct match>"}, ...],"explanation":"<optional>","topic":"<optional>"}

Rules:
- Classify based on what the document actually shows — do not force everything into mcq_single.
- For options/answers, copy text exactly as written in the source (no re-wording).
- Skip anything that isn't actually a question (headings, instructions, page numbers).
- Output ONLY a valid JSON array of question objects, no markdown fences, no commentary.

Document text:
${rawText.substring(0, MAX_DOC_CHARS)}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 8192,
  });

  const raw = stripFences(completion.choices[0]?.message?.content || "");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Response was not a JSON array");

  return parsed.map((q) => coerceQuestion(q as RawParsedQuestion)).filter((q): q is QuizQuestion => q !== null);
}
