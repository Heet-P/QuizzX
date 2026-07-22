"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut, User, Trophy, BookOpen, Shield, Menu, X, Users, LayoutDashboard, Radio } from "lucide-react";

// Ported from client/src/components/Layout.jsx, restyled to the editorial
// design system (design_idea/DesignPhilo.md). Role/username are resolved
// server-side (via lib/auth.ts's getCurrentUser) and passed in as props.
export function AppNav({ role, username }: { role: string; username: string }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = role === "admin";

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, bg: "bg-green" },
    { href: "/quizzes", label: "Quizzes", icon: BookOpen, bg: "bg-white border-2 border-ink/10" },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy, bg: "bg-yellow" },
    { href: "/team", label: "Team", icon: Users, bg: "bg-blue text-white" },
    ...(isAdmin ? [{ href: "/live", label: "Live", icon: Radio, bg: "bg-coral text-white" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield, bg: "bg-purple text-white" }] : []),
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-7xl rounded-[28px] border border-ink/5 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-[var(--shadow-tactile-sm)]">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-xl sm:text-2xl font-medium tracking-tight" onClick={closeMenu}>
          QUIZZX
        </Link>

        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden btn-tactile bg-cream-alt p-2">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden sm:flex items-center gap-2 lg:gap-3">
          {navLinks.map(({ href, label, icon: Icon, bg }) => (
            <Link key={href} href={href} className={`chip normal-case font-sans ${bg}`}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
          <div className="flex items-center gap-2 border-l border-ink/10 pl-3 ml-1">
            <Link
              href="/profile"
              className="chip normal-case font-sans bg-cream hover:bg-cream-alt transition-colors"
              title="Go to Profile"
            >
              <User size={16} />
              <span className="hidden lg:inline">{username}</span>
            </Link>
            <button onClick={handleLogout} className="rounded-full bg-ink text-white p-2 hover:bg-ink/80 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden mt-3 border-t border-ink/10 pt-3 space-y-2">
          {navLinks.map(({ href, label, icon: Icon, bg }) => (
            <Link key={href} href={href} onClick={closeMenu} className={`chip normal-case font-sans w-full justify-start ${bg}`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-ink/10 mt-2">
            <Link href="/profile" onClick={closeMenu} className="chip normal-case font-sans bg-cream" title="Go to Profile">
              <User size={16} /> {username}
            </Link>
            <button onClick={handleLogout} className="chip normal-case font-sans bg-ink text-white">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
