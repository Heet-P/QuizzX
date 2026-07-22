import { QuizClient } from "@/components/quiz/QuizClient";

// Thin Server Component shell so QuizClient (a Client Component — it needs
// useState/useEffect throughout for the quiz-taking state machine) doesn't
// have to unwrap params/searchParams itself via `use()`. Next.js 16 makes
// both fully async (Promise-returning), so awaiting them here keeps that
// off the client component entirely.
export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ challenge?: string }>;
}) {
  const { id } = await params;
  const { challenge } = await searchParams;

  return <QuizClient id={id} challengerId={challenge ?? null} />;
}
