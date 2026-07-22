import "server-only";
import type { QuizQuestion } from "@/types/quiz";

// Ported verbatim from server/src/services/QuizParser.js — parses an
// uploaded .md/.txt/.docx quiz document into the QuizQuestion[] shape.
// Two supported formats: "### Q1" heading style, or plain numbered/# style.
export function parseMarkdown(content: string): QuizQuestion[] {
  const hasHeadings = /^###\s+Q\d+/m.test(content);
  return hasHeadings ? parseHeadingFormat(content) : parseNumberedFormat(content);
}

function parseHeadingFormat(content: string): QuizQuestion[] {
  const blocks = content.split(/(?=^###\s+Q\d+)/m).filter((b) => /^###\s+Q\d+/m.test(b));
  return blocks
    .map((block, idx) => {
      const lines = block.split("\n");
      let codeBlock = "";
      let inCodeBlock = false;
      let questionPrompt = "";
      const options: { label: string; text: string }[] = [];
      let answer: string | null = null;
      let explanation: string | null = null;
      let topic: string | null = null;

      for (const line of lines) {
        const t = line.trim();
        if (/^###\s+Q\d+/.test(t) || /^---+$/.test(t) || !t) continue;

        if (t.startsWith("```")) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          codeBlock += (codeBlock ? "\n" : "") + line;
          continue;
        }

        const boldMatch = t.match(/^\*\*(.+?)\*\*$/);
        if (boldMatch) {
          questionPrompt = boldMatch[1];
          continue;
        }

        const optionMatch = t.match(/^[-*]\s+([A-Za-z])\)\s*(.+)/);
        if (optionMatch) {
          options.push({ label: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
          continue;
        }

        const optNoBullet = t.match(/^([A-Za-z])\)\s+(.+)/);
        if (optNoBullet) {
          options.push({ label: optNoBullet[1].toUpperCase(), text: optNoBullet[2].trim() });
          continue;
        }

        const answerMatch = t.match(/^(?:Correct\s*)?Answer\s*[:=]\s*([A-Za-z])(?:\).*)?$/i);
        if (answerMatch) {
          const l = answerMatch[1].toUpperCase();
          const o = options.find((opt) => opt.label === l);
          answer = o ? o.text : l;
          continue;
        }

        const answerFull = t.match(/^(?:Correct\s*)?Answer\s*[:=]\s*(.+)/i);
        if (answerFull) {
          answer = answerFull[1].trim();
          continue;
        }

        const explanationMatch = t.match(/^Explanation\s*[:=]\s*(.+)/i);
        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
          continue;
        }

        const topicMatch = t.match(/^Topic\s*[:=]\s*(.+)/i);
        if (topicMatch) {
          topic = topicMatch[1].trim();
          continue;
        }
      }

      let questionText = codeBlock ? codeBlock + "\n\n" : "";
      questionText += questionPrompt || `Question ${idx + 1}`;

      return {
        text: questionText,
        code: codeBlock || null,
        prompt: questionPrompt || null,
        options: options.map((o) => `${o.label}) ${o.text}`),
        answer: answer ?? "",
        explanation,
        topic,
      };
    })
    .filter((q) => q.options.length > 0);
}

function parseNumberedFormat(content: string): QuizQuestion[] {
  const lines = content.split("\n");
  const questions: QuizQuestion[] = [];
  let current: QuizQuestion | null = null;

  lines.forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (/^#\s+/.test(t) && !/^##/.test(t)) return;

    const numMatch = t.match(/^\d+[.)]\s+(.+)/);
    const qMatch = t.match(/^Q\d+[.:)]\s*(.+)/i);
    const hMatch = t.match(/^#{2,4}\s+(.+)/);

    if (numMatch || qMatch || hMatch) {
      if (current?.text) questions.push(current);
      current = {
        text: (numMatch?.[1] || qMatch?.[1] || hMatch?.[1] || "").replace(/\*\*/g, "").trim(),
        options: [],
        answer: "",
        explanation: null,
        topic: null,
      };
      return;
    }
    if (!current) return;

    const answerMatch = t.match(/^(?:Correct\s*)?Answer\s*[:=]\s*(.+)/i);
    if (answerMatch) {
      current.answer = answerMatch[1].replace(/\*\*/g, "").trim();
      return;
    }

    const explanationMatch = t.match(/^Explanation\s*[:=]\s*(.+)/i);
    if (explanationMatch) {
      current.explanation = explanationMatch[1].trim();
      return;
    }

    const topicMatch = t.match(/^Topic\s*[:=]\s*(.+)/i);
    if (topicMatch) {
      current.topic = topicMatch[1].trim();
      return;
    }

    const bulletOpt = t.match(/^[-*]\s+(?:[A-Za-z]\)\s*)?(.+)/);
    const letterOpt = t.match(/^(?:\(?[A-Za-z][.)]\s*)(.+)/);
    if (bulletOpt) {
      current.options.push(bulletOpt[1].replace(/\*\*/g, "").trim());
    } else if (letterOpt) {
      current.options.push(letterOpt[1].replace(/\*\*/g, "").trim());
    }
  });

  if (current && (current as QuizQuestion).text) questions.push(current);
  return questions;
}
