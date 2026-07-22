"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut, User, Trophy, BookOpen, Shield, Menu, X, Users, LayoutDashboard, Radio, GraduationCap } from "lucide-react";

// Ported from client/src/components/Layout.jsx, restyled to the editorial
// design system (design_idea/DesignPhilo.md). Role/username are resolved
// server-side (via lib/auth.ts's getCurrentUser) and passed in as props.
export function AppNav({ role, username }: { role: string; username: string }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = role === "admin";
  const isTeacher = role === "teacher" || isAdmin;

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, activeBg: "bg-green text-ink font-bold shadow-[0_0_12px_rgba(34,197,94,0.4)]" },
    { href: "/quizzes", label: "Quizzes", icon: BookOpen, activeBg: "bg-cream text-ink font-bold shadow-[0_0_12px_rgba(242,232,211,0.3)]" },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy, activeBg: "bg-yellow text-ink font-bold shadow-[0_0_12px_rgba(255,210,0,0.4)]" },
    { href: "/team", label: "Team", icon: Users, activeBg: "bg-blue text-white font-bold shadow-[0_0_12px_rgba(46,91,255,0.4)]" },
    ...(isTeacher ? [{ href: "/teacher", label: "Teacher", icon: GraduationCap, activeBg: "bg-orange text-white font-bold shadow-[0_0_12px_rgba(255,149,0,0.4)]" }] : []),
    ...(isAdmin ? [{ href: "/live", label: "Live", icon: Radio, activeBg: "bg-coral text-white font-bold shadow-[0_0_12px_rgba(255,75,54,0.4)]" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield, activeBg: "bg-purple text-white font-bold shadow-[0_0_12px_rgba(139,92,246,0.4)]" }] : []),
  ];

  const isProfileActive = pathname === "/profile";

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-7xl rounded-[28px] border border-white/15 bg-ink/95 text-cream backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-[0_12px_32px_-8px_rgba(20,18,15,0.45)]">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-xl sm:text-2xl font-medium tracking-tight text-white hover:text-yellow transition-colors pr-2" onClick={closeMenu}>
          QUIZZX
        </Link>

        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cream hover:bg-white/20 transition-colors">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map(({ href, label, icon: Icon, activeBg }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-accent text-sm font-bold tracking-wide transition-all duration-200 ${
                  isActive
                    ? activeBg
                    : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}

          <div className="flex items-center gap-2 border-l border-white/15 pl-2.5 ml-1">
            <Link
              href="/profile"
              className={`inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-2 font-accent text-sm font-bold tracking-wide transition-all duration-200 ${
                isProfileActive
                  ? "bg-cream text-ink shadow-[0_0_12px_rgba(242,232,211,0.3)]"
                  : "bg-white/10 text-cream hover:bg-white/15 hover:text-white border border-white/15"
              }`}
              title="Go to Profile"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-current">
                <User size={12} />
              </div>
              <span className="hidden lg:inline max-w-[110px] truncate leading-none">{username}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-coral hover:text-white transition-all duration-200"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden mt-3 border-t border-white/15 pt-3 space-y-2">
          {navLinks.map(({ href, label, icon: Icon, activeBg }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-sm w-full justify-start transition-all ${
                  isActive ? activeBg : "text-white/80 hover:bg-white/10 border border-transparent"
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-white/15 mt-2">
            <Link
              href="/profile"
              onClick={closeMenu}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-sans ${
                isProfileActive ? "bg-cream text-ink font-bold" : "bg-white/10 text-cream border border-white/15"
              }`}
            >
              <User size={14} /> {username}
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-sm bg-coral text-white">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
