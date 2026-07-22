"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef, type ReactNode } from "react";
import {
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Trophy,
  Target,
  Percent,
  Flame,
  CalendarCheck,
  Lock,
  Gauge,
  Medal,
  Crown,
  Award,
  type LucideIcon,
} from "lucide-react";

// Ported from client/src/components/Toast.jsx.

type ToastType = "success" | "error" | "info" | "achievement" | "xp";

interface ToastItemData {
  id: number;
  type: ToastType;
  message?: string;
  achievement?: string;
  xp?: number;
  duration?: number;
}

interface ToastApi {
  success: (message: string, opts?: Partial<ToastItemData>) => void;
  error: (message: string, opts?: Partial<ToastItemData>) => void;
  info: (message: string, opts?: Partial<ToastItemData>) => void;
  achievement: (achievement: string, opts?: Partial<ToastItemData>) => void;
  xp: (xp: number, opts?: Partial<ToastItemData>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_quiz: Target,
  perfect_score: Percent,
  streak_3: Flame,
  streak_7: CalendarCheck,
  lockdown_clean: Lock,
  speed_demon: Gauge,
  top_3: Medal,
  team_champion: Crown,
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_quiz: "First Quiz Complete!",
  perfect_score: "Perfect Score!",
  streak_3: "3-Day Streak!",
  streak_7: "7-Day Streak!",
  lockdown_clean: "Lockdown Clean",
  speed_demon: "Speed Demon",
  top_3: "Top 3 Finish!",
  team_champion: "Team Champion!",
};

function ToastItem({ toast, onClose }: { toast: ToastItemData; onClose: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onClose(toast.id), 250);
  }, [toast.id, onClose]);

  useEffect(() => {
    const t = setTimeout(handleClose, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [handleClose, toast.duration]);

  const baseClass = `flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card-sm)] shadow-[var(--shadow-tactile)] font-accent font-bold text-sm transition-all duration-250 max-w-sm w-full ${
    exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
  }`;

  if (toast.type === "achievement") {
    const AchievementIcon = ACHIEVEMENT_ICONS[toast.achievement ?? ""] ?? Award;
    return (
      <div className={`${baseClass} bg-yellow`}>
        <AchievementIcon size={22} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold uppercase text-xs text-ink/75">Achievement Unlocked</p>
          <p className="font-bold">{ACHIEVEMENT_LABELS[toast.achievement ?? ""] ?? toast.achievement}</p>
        </div>
        <button onClick={handleClose} className="shrink-0 p-0.5 hover:opacity-80">
          <X size={16} />
        </button>
      </div>
    );
  }

  if (toast.type === "xp") {
    return (
      <div className={`${baseClass} bg-blue text-ink`}>
        <Trophy size={20} className="shrink-0 text-yellow" />
        <div className="flex-1 min-w-0">
          <p className="font-bold uppercase text-xs opacity-80">XP Earned</p>
          <p className="font-bold text-lg">+{toast.xp} XP</p>
        </div>
        <button onClick={handleClose} className="shrink-0 p-0.5 hover:opacity-80">
          <X size={16} />
        </button>
      </div>
    );
  }

  const styles: Record<string, string> = {
    success: "bg-green text-white",
    error: "bg-coral text-white",
    info: "bg-white",
  };
  const icons: Record<string, ReactNode> = {
    success: <CheckCircle size={18} className="shrink-0" />,
    error: <AlertCircle size={18} className="shrink-0" />,
    info: <Info size={18} className="shrink-0" />,
  };

  return (
    <div className={`${baseClass} ${styles[toast.type] ?? styles.info}`}>
      {icons[toast.type] ?? icons.info}
      <p className="flex-1 min-w-0 truncate">{toast.message}</p>
      <button onClick={handleClose} className="shrink-0 p-0.5 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((toast: Omit<ToastItemData, "id">) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastApi = {
    success: (message, opts) => addToast({ type: "success", message, ...opts }),
    error: (message, opts) => addToast({ type: "error", message, ...opts }),
    info: (message, opts) => addToast({ type: "info", message, ...opts }),
    achievement: (achievement, opts) => addToast({ type: "achievement", achievement, duration: 5000, ...opts }),
    xp: (xp, opts) => addToast({ type: "xp", xp, duration: 3500, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
