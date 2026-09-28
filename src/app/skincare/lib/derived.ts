import type { AppData, Product, Routine } from "./types";
import { addDays, daysBetween, todayISO } from "./dates";

export function isRoutineDueOn(routine: Routine, date: string): boolean {
  if (routine.freqMode === "todos") return true;
  if (routine.freqMode === "dias") {
    const dow = new Date(date + "T00:00:00").getDay();
    return routine.days.includes(dow);
  }
  // intervalo: due every N days counting from a fixed epoch so it's stable
  const epoch = "2026-01-01";
  const diff = daysBetween(epoch, date);
  const interval = Math.max(1, routine.interval);
  return ((diff % interval) + interval) % interval === 0;
}

export function stepsDoneCount(
  data: AppData,
  routine: Routine,
  date: string,
): { done: number; total: number } {
  const total = routine.stepOrder.length;
  const done = routine.stepOrder.filter((stepId) =>
    data.checkinItems.some(
      (ci) => ci.date === date && ci.stepId === stepId && ci.done,
    ),
  ).length;
  return { done, total };
}

export function isDayComplete(data: AppData, date: string): boolean {
  const due = data.routines.filter((r) => r.status === "active" && isRoutineDueOn(r, date));
  return due.some((r) => {
    const { done, total } = stepsDoneCount(data, r, date);
    return total > 0 && done === total;
  });
}

export function computeStreak(data: AppData, upTo: string = todayISO()): number {
  let streak = 0;
  let cursor = upTo;
  // Walk backward; a day counts if at least one due routine was fully completed.
  // Stop at the first day (excluding today, which may still be in progress) that misses.
  for (let i = 0; i < 365; i++) {
    if (isDayComplete(data, cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (cursor === upTo) {
      // today not finished yet doesn't break the streak, just isn't counted
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}

function earliestActivityDate(data: AppData): string | null {
  const dates = [
    ...data.checkinItems.map((c) => c.date),
    ...data.checkins.filter((c) => c.note.trim() || c.tags.length).map((c) => c.date),
  ];
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a < b ? a : b));
}

export function computeBestStreak(data: AppData): number {
  const start = earliestActivityDate(data);
  if (!start) return 0;
  const today = todayISO();
  let best = 0;
  let running = 0;
  let cursor = start;
  for (let i = 0; i < 3650; i++) {
    if (isDayComplete(data, cursor)) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    if (cursor === today) break;
    cursor = addDays(cursor, 1);
  }
  return best;
}

export interface WeekAdherence {
  weekStart: string;
  weekEnd: string;
  completedDays: number;
  totalDays: number;
  pct: number;
}

// Rolling 7-day windows ending today, going back only as far as there's real
// activity to show — otherwise early weeks before the user started would
// render as misleading 0% bars instead of simply not existing yet.
export function computeWeeklyAdherence(data: AppData, maxWeeks = 12): WeekAdherence[] {
  const today = todayISO();
  const start = earliestActivityDate(data) ?? today;
  const daysOfHistory = daysBetween(start, today) + 1;
  const weeks = Math.max(1, Math.min(maxWeeks, Math.ceil(daysOfHistory / 7)));

  const results: WeekAdherence[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = addDays(today, -w * 7);
    const weekStart = addDays(weekEnd, -6);
    let completedDays = 0;
    let totalDays = 0;
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      if (date < start || date > today) continue;
      totalDays++;
      if (isDayComplete(data, date)) completedDays++;
    }
    if (totalDays === 0) continue;
    results.push({
      weekStart,
      weekEnd,
      completedDays,
      totalDays,
      pct: Math.round((completedDays / totalDays) * 100),
    });
  }
  return results;
}

export function computeMonthPct(data: AppData, monthsAgo = 0): number {
  const today = todayISO();
  const ref = new Date(today + "T00:00:00");
  ref.setMonth(ref.getMonth() - monthsAgo);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const lastDay = monthsAgo === 0 ? ref.getDate() : new Date(year, month + 1, 0).getDate();
  let completed = 0;
  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isDayComplete(data, date)) completed++;
  }
  return lastDay > 0 ? Math.round((completed / lastDay) * 100) : 0;
}

export function computeProductLife(product: Product): {
  daysUntilExpire: number;
  lifePct: number;
} {
  const expiresAt = addDays(product.openedAt, product.shelfLifeDays);
  const daysUntilExpire = daysBetween(todayISO(), expiresAt);
  const lifePct = Math.max(
    0,
    Math.min(100, Math.round((daysUntilExpire / product.shelfLifeDays) * 100)),
  );
  return { daysUntilExpire, lifePct };
}

export function isRunningLow(product: Product): boolean {
  const { lifePct } = computeProductLife(product);
  return product.stock <= 20 || lifePct <= 15;
}

export function weekHasSkinLog(data: AppData): boolean {
  const cutoff = addDays(todayISO(), -7);
  return data.skinLogs.some((l) => l.date >= cutoff);
}

export function lastSkinLogDaysAgo(data: AppData): number | null {
  if (data.skinLogs.length === 0) return null;
  const latest = data.skinLogs.reduce((a, b) => (a.date > b.date ? a : b));
  return daysBetween(latest.date, todayISO());
}

export const CATEGORY_LABEL: Record<string, string> = {
  limpeza: "limpeza",
  tratamento: "tratamento",
  hidratacao: "hidratação",
  protecao: "proteção",
};

export const PRIORITY_LABEL: Record<string, string> = {
  proxima: "próxima compra",
  testar: "quero testar",
  algumdia: "algum dia",
};
