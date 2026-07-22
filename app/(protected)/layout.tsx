import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

// Replaces the old client/src/components/ProtectedRoute.jsx — every route
// nested under this group requires a signed-in session. Real authorization
// (role checks etc.) still happens per-page; this only gates "signed in at all".
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      <AppNav role={user.role} username={user.username} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-28 sm:pt-32 pb-12">{children}</main>
    </div>
  );
}
