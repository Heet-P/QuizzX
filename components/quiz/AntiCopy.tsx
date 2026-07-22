"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

// Ported from client/src/components/AntiCopy.jsx.
export function AntiCopy({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const warn = () => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
    };

    const blockCopy = (e: Event) => {
      e.preventDefault();
      warn();
    };
    const blockContextMenu = (e: Event) => {
      e.preventDefault();
      warn();
    };
    const blockKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "a", "u", "s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        warn();
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        warn();
      }
    };

    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeydown);

    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeydown);
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <div style={{ userSelect: "none" }} onDragStart={(e) => e.preventDefault()}>
      {showWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-[var(--radius-btn)] bg-coral px-6 py-3 font-accent font-bold text-white shadow-[var(--shadow-tactile)] animate-bounce">
          <ShieldAlert size={20} />
          Copying is disabled during the quiz!
        </div>
      )}
      {children}
    </div>
  );
}
