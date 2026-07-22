import { ResultsClient } from "@/components/quiz/ResultsClient";

// Thin Server Component shell (same pattern as ../page.tsx) so ResultsClient
// doesn't need next/navigation's useParams/useSearchParams + a Suspense
// boundary — params/searchParams are awaited here instead.
export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    score?: string;
    correct?: string;
    total?: string;
    quizTitle?: string;
    streak?: string;
    practice?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <ResultsClient
      id={id}
      urlFallback={{
        score: Number(sp.score || 0),
        correct: Number(sp.correct || 0),
        total: Number(sp.total || 0),
        quizTitle: sp.quizTitle || "Quiz",
        streak: Number(sp.streak || 0),
      }}
      isPractice={sp.practice === "1"}
    />
  );
}
