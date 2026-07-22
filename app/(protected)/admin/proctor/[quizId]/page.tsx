import { ProctorClient } from "@/components/admin/ProctorClient";

export default async function ProctorPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return <ProctorClient quizId={quizId} />;
}
