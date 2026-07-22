"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { SmartCTAButton } from "@/components/landing/SmartCTAButton";

// Extracted from the landing page's inline nav — needs useState for the
// mobile menu toggle, so it's split into its own Client Component while the
// rest of the landing page stays a Server Component.
export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <nav className="lg:hidden sticky top-4 z-50 mx-4 sm:mx-6 rounded-[28px] bg-white/90 backdrop-blur-md border border-ink/5 shadow-[var(--shadow-tactile-sm)] px-5 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-display text-xl font-medium tracking-tight">
          QUIZZX
        </Link>

        <div className="hidden md:flex gap-1 font-accent font-bold text-sm">
          <a href="#features" className="chip bg-transparent hover:bg-cream-alt normal-case">
            Features
          </a>
          <a href="#faq" className="chip bg-transparent hover:bg-cream-alt normal-case">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button className="md:hidden btn-tactile bg-cream-alt p-2 text-sm" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {!isSignedIn && (
            <Link href="/login" className="btn-tactile bg-blue text-white text-sm hidden sm:inline-flex">
              Sign In
            </Link>
          )}
          <SmartCTAButton className="btn-tactile bg-yellow text-sm">
            {isSignedIn ? "Dashboard" : "Get Started"}
          </SmartCTAButton>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-ink/10 flex flex-col gap-1 font-accent font-bold text-sm">
          <a href="#features" onClick={() => setMenuOpen(false)} className="chip bg-transparent normal-case justify-start">
            Features
          </a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="chip bg-transparent normal-case justify-start">
            FAQ
          </a>
          {isSignedIn ? (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="chip bg-yellow normal-case justify-start">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="chip bg-blue text-white normal-case justify-start">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
