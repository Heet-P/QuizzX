import { PresenterClient } from "@/components/live/PresenterClient";

export default async function PresenterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PresenterClient code={code} />;
}
