import { Target, Percent, Flame, CalendarCheck, Lock, Gauge, Medal, Crown, type LucideIcon } from "lucide-react";

// Single source of truth for slug -> icon/label, shared by Toast.tsx (achievement
// toasts) and any page rendering the achievement catalogue (dashboard, profile).
// Icons stand in for v1's raw emoji (never render emoji directly in this app's UI).
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_quiz: Target,
  perfect_score: Percent,
  streak_3: Flame,
  streak_7: CalendarCheck,
  lockdown_clean: Lock,
  speed_demon: Gauge,
  top_3: Medal,
  team_champion: Crown,
};

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_quiz: "First Quiz Complete!",
  perfect_score: "Perfect Score!",
  streak_3: "3-Day Streak!",
  streak_7: "7-Day Streak!",
  lockdown_clean: "Lockdown Clean",
  speed_demon: "Speed Demon",
  top_3: "Top 3 Finish!",
  team_champion: "Team Champion!",
};
