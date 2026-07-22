"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export function SmartCTAButton({
  children,
  className = "btn-tactile bg-yellow text-ink text-sm",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isSignedIn } = useUser();
  const targetHref = isSignedIn ? "/dashboard" : "/login";

  return (
    <Link href={targetHref} className={className}>
      {children}
    </Link>
  );
}
