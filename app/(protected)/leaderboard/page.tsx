import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ quizId?: string }>;
}) {
  const { quizId } = await searchParams;
  return <LeaderboardClient initialQuizId={quizId ?? null} />;
}
