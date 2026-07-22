// XP/level math, ported verbatim from v1 (DashboardPage.jsx / ProfilePage.jsx both
// defined this identically) — shared here since both v2 pages need the same formula.
export const XP_PER_LEVEL = 200;

export function getLevel(xp: number): number {
  return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(xp: number): number {
  return (xp || 0) % XP_PER_LEVEL;
}
