import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// A separate route group from (protected): still requires sign-in, but
// deliberately renders no AppNav/padding chrome — the presenter/display view
// (client/src/pages/PresenterPage.jsx) is meant to fill the whole screen on
// a projector/TV, not sit inside the normal app shell.
export default async function PresenterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <>{children}</>;
}
