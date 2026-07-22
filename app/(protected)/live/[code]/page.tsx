import { LiveLobbyClient } from "@/components/live/LiveLobbyClient";

export default async function LiveLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <LiveLobbyClient code={code} />;
}
