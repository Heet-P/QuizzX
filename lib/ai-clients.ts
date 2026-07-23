import "server-only";
import OpenAI from "openai";
import { mapAnswerLetter } from "./answer-matching";
import type { QuizQuestion, McqSingleQuestion } from "@/types/quiz";

// Ported from server/src/controllers/AIController.js. Both providers use the
// OpenAI-compatible chat completions API. Falls back to 'not-set' so the
// module doesn't throw at import time if a key is absent — GROQ_API_KEY /
// NVIDIA_NIM_API_KEY aren't configured yet (see MEMORY.md Section 9/11); the
// user will add both later, at which point these activate with no code
// changes needed.
export const nim = new OpenAI({
  apiKey: process.env.NVIDIA_NIM_API_KEY || "not-set",
  baseURL: "https://integrate.api.nvidia.com/v1",
});
// Updated 2026-07-23 to the model the user confirmed working against their
// NIM key (a reasoning/"harmony"-format model — it can emit a separate
// `reasoning_content` field alongside `content`; streamToText below only
// ever accumulates `content`, so the reasoning trace is never surfaced to
// end users, intentionally).
export const NIM_MODEL = "openai/gpt-oss-120b";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "not-set",
  baseURL: "https://api.groq.com/openai/v1",
});
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function streamToText(stream: AsyncIterable<{ choices: { delta?: { content?: string | null } }[] }>): Promise<string> {
  let out = "";
  for await (const chunk of stream) {
    out += chunk.choices[0]?.delta?.content || "";
  }
  return out.trim();
}

/** Strips ```json fences a model sometimes wraps its JSON output in. */
export function stripFences(s: string): string {
  return s
    .replace(/^```json?\n?/, "")
    .replace(/^```\n?/, "")
    .replace(/```$/, "")
    .trim();
}

/**
 * Ported from AIController.js's generateQuestions — used by both
 * POST /api/ai/generate-quiz and POST /api/admin/daily-challenge (the daily
 * challenge always requests 5 questions).
 */
export async function generateQuestions(topic: string, syllabus: string | undefined, count: number): Promise<QuizQuestion[]> {
  const numQ = Math.min(30, Math.max(3, parseInt(String(count)) || 10));

  const prompt = `Generate ${numQ} multiple-choice quiz questions about: ${topic}.
${syllabus ? `\nSyllabus / context:\n${syllabus.substring(0, 3000)}\n` : ""}
Rules:
- Each question must have exactly 4 answer options.
- Exactly one option must be correct.
- Options should be plausible and varied in difficulty.
- Include a brief explanation (1-2 sentences) for the correct answer.

Return ONLY a valid JSON array. Each element must follow this exact shape:
{"text":"<question text>","options":["<option 1>","<option 2>","<option 3>","<option 4>"],"answer":"A","explanation":"<why it is correct>"}

CRITICAL rules for the "answer" field:
- Use ONLY a single capital letter: A, B, C, or D
- A means options[0] is correct, B means options[1], C means options[2], D means options[3]
No markdown fences, no commentary, no trailing text. Start your response with [ and end with ].`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 8192,
  });

  const raw = stripFences(completion.choices[0]?.message?.content || "");
  const questions = JSON.parse(raw);
  if (!Array.isArray(questions)) throw new Error("Response was not a JSON array");

  return questions
    .map((q: { text?: string; question?: string; options?: unknown[]; answer?: string; explanation?: string }) => {
      const text = String(q.text || q.question || "");
      const options = Array.isArray(q.options) ? q.options.map((s) => String(s).trim()) : [];
      const rawAnswer = String(q.answer || "").trim();

      let answer = mapAnswerLetter(rawAnswer, options);
      if (!answer) {
        const lower = rawAnswer.toLowerCase();
        answer = options.find((o) => o.toLowerCase() === lower) || rawAnswer;
      }

      return { text, options, answer, explanation: String(q.explanation || "") };
    })
    .filter((q: McqSingleQuestion) => q.text && q.options.length === 4 && q.options.includes(q.answer)) as QuizQuestion[];
}
