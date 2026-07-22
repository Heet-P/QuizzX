"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { Zap } from "lucide-react";

// Top-right auth CTA, beside the SidebarNav menu trigger. Self-contained
// (reads auth state via useUser() instead of prop-drilling from the server
// page) since this is the only place on the landing page that needs it.
// Note: app/page.tsx currently redirects signed-in users to /dashboard
// before they ever see this page, so the signed-in branch below is correct
// but not reachable yet — flagged separately, not changed here since that's
// a bigger behavioral call than this styling request.
export function AuthCTA() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div className="h-[46px]" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <UserButton />
        <Link href="/quizzes" className="btn-tactile bg-yellow text-ink text-sm">
          <Zap size={16} /> Start a Quiz
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn-tactile bg-ink text-white text-sm">
        Sign In
      </Link>
      <Link href="/register" className="btn-tactile bg-yellow text-ink text-sm">
        <Zap size={16} /> Get Started
      </Link>
    </div>
  );
}
