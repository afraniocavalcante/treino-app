import { formatDate, type HistoryEntry } from "./program";
import { dayTotals, type DietDayLog, type DietPlan } from "./diet";

/** Consecutive days (ending today, or yesterday if today isn't complete yet) where both training and diet were logged complete. */
export function getPerfectStreak(trainedDates: Set<string>, dietedDates: Set<string>): number {
  const isPerfect = (d: string) => trainedDates.has(d) && dietedDates.has(d);
  const today = formatDate(new Date());
  let streak = 0;
  const cursor = new Date();
  if (isPerfect(today)) {
    streak = 1;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (isPerfect(formatDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Total historical days (not necessarily consecutive) where both training and diet were complete. */
export function getTotalPerfectDays(trainedDates: Set<string>, dietedDates: Set<string>): number {
  return [...trainedDates].filter((d) => dietedDates.has(d)).length;
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
}

const STREAK_TIERS: { min: number; emoji: string; label: string }[] = [
  { min: 14, emoji: "⚡", label: "14 dias perfeitos seguidos" },
  { min: 7, emoji: "🔥", label: "7 dias perfeitos seguidos" },
  { min: 3, emoji: "✨", label: "3 dias perfeitos seguidos" },
];

const TOTAL_TIERS: { min: number; emoji: string; label: string }[] = [
  { min: 100, emoji: "👑", label: "100 dias de constância combinada" },
  { min: 30, emoji: "🏆", label: "30 dias de constância combinada" },
];

/** Highest streak tier + highest total-days tier currently earned (at most 2 badges, no locked/empty states). */
export function getTopBadges(perfectStreak: number, totalPerfectDays: number): Badge[] {
  const badges: Badge[] = [];
  const streakTier = STREAK_TIERS.find((t) => perfectStreak >= t.min);
  if (streakTier) badges.push({ id: `streak-${streakTier.min}`, emoji: streakTier.emoji, label: streakTier.label });
  const totalTier = TOTAL_TIERS.find((t) => totalPerfectDays >= t.min);
  if (totalTier) badges.push({ id: `total-${totalTier.min}`, emoji: totalTier.emoji, label: totalTier.label });
  return badges;
}

/** Total kg×reps logged per date — a simple training-load proxy to plot against body weight. */
export function getTrainingVolumeByDate(history: HistoryEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of history) {
    let volume = 0;
    for (const sets of Object.values(entry.exercises)) {
      for (const s of sets) volume += (s.kg || 0) * (s.reps || 1);
    }
    if (volume > 0) map.set(entry.date, (map.get(entry.date) ?? 0) + volume);
  }
  return map;
}

/** Average protein intake on past days the same program workout was trained — the "a day like today" comparator. */
export function getProteinForWorkout(
  trainHistory: HistoryEntry[],
  dietHistory: DietDayLog[],
  plan: DietPlan,
  programWorkoutId: string,
  excludeDate?: string
): { avg: number; count: number } {
  const dietByDate = new Map(dietHistory.map((h) => [h.date, h]));
  const proteins = trainHistory
    .filter((e) => e.programWorkoutId === programWorkoutId && e.date !== excludeDate)
    .map((e) => dietByDate.get(e.date))
    .filter((h): h is DietDayLog => !!h)
    .map((h) => dayTotals(plan, h.picks).p);
  if (proteins.length === 0) return { avg: 0, count: 0 };
  return { avg: Math.round(proteins.reduce((a, v) => a + v, 0) / proteins.length), count: proteins.length };
}

export function isDeloadPhase(phaseName: string): boolean {
  return phaseName.toLowerCase().includes("deload");
}
