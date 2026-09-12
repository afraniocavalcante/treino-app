export interface MacroValues {
  kcal: number;
  p: number;
  c: number;
  g: number;
}

export interface DietMealOption extends MacroValues {
  label: string;
}

export interface DietMealRadioGroup extends MacroValues {
  key: string;
  title: string;
  items: string[];
}

export interface DietMealGroups {
  radioGroups: DietMealRadioGroup[];
  toggle: { key: string; label: string } & MacroValues;
}

export interface DietMeal {
  id: string;
  key: string;
  label: string;
  kind: "list" | "builder";
  orderIndex: number;
  allowPortion: boolean;
  hasNoneOption: boolean;
  options: DietMealOption[] | null;
  groups: DietMealGroups | null;
}

export interface DietSupplement {
  id: string;
  key: string;
  label: string;
  timing: string | null;
  orderIndex: number;
}

export interface DietSupplementGroup {
  id: string;
  title: string;
  note: string | null;
  orderIndex: number;
  items: { name: string; dose: string }[];
}

export interface DietShoppingCategory {
  id: string;
  name: string;
  orderIndex: number;
  items: string[];
}

export interface DietRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
}

export interface DietFruitEquivalent {
  name: string;
  amount: string;
}

export interface DietPlan {
  id: string;
  name: string;
  kcalTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  nutriName: string | null;
  nutriCrn: string | null;
  objective: string | null;
  waterGoal: string | null;
  nextConsult: string | null;
  generalRules: string[];
  recipe: DietRecipe | null;
  fruitEquivalents: DietFruitEquivalent[];
  meals: DietMeal[];
  supplements: DietSupplement[];
  supplementGroups: DietSupplementGroup[];
  shoppingCategories: DietShoppingCategory[];
}

export interface AlmocoPicks {
  carb: number | null;
  leg: number | null;
  prot: number | null;
  fruta: boolean;
  skipped: boolean;
}

export interface DietDayPicks {
  cafe: number | "skip" | null;
  cafePortion: number;
  almoco: AlmocoPicks;
  lanche: number | "skip" | null;
  lanchePortion: number;
  jantar: number | "skip" | null;
  jantarPortion: number;
  sobremesa: number | "none" | null;
}

export function emptyDietDay(): DietDayPicks {
  return {
    cafe: null,
    cafePortion: 1,
    almoco: { carb: null, leg: null, prot: null, fruta: false, skipped: false },
    lanche: null,
    lanchePortion: 1,
    jantar: null,
    jantarPortion: 1,
    sobremesa: null,
  };
}

/** A skipped meal counts as done (for streaks/checklists) but contributes no macros — the "avoid overshooting kcal" escape hatch. */
export function isMealSkipped(meal: DietMeal, picks: DietDayPicks): boolean {
  if (meal.key === "almoco") return picks.almoco.skipped;
  if (meal.hasNoneOption) return false; // sobremesa already has its own "none" option
  const idx = picks[meal.key as "cafe" | "lanche" | "jantar"];
  return idx === "skip";
}

export interface DietDayLog {
  date: string;
  picks: DietDayPicks;
  supplements: Record<string, boolean>;
}

export interface DietMeasurement {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
}

export function findMeal(plan: DietPlan, key: string): DietMeal | undefined {
  return plan.meals.find((m) => m.key === key);
}

/** Sums the macros of everything picked for a given meal key, given the day's current picks. */
function mealTotal(plan: DietPlan, key: string, picks: DietDayPicks): MacroValues {
  const zero = { kcal: 0, p: 0, c: 0, g: 0 };
  const meal = findMeal(plan, key);
  if (!meal) return zero;

  if (key === "almoco") {
    if (!meal.groups || picks.almoco.skipped) return zero;
    const a = picks.almoco;
    const total = { ...zero };
    const add = (m: MacroValues) => {
      total.kcal += m.kcal;
      total.p += m.p;
      total.c += m.c;
      total.g += m.g;
    };
    const byKey = (k: string) => meal.groups!.radioGroups.find((g) => g.key === k);
    if (a.carb != null) { const grp = byKey("carb"); if (grp) add(grp); }
    if (a.leg != null) { const grp = byKey("leg"); if (grp) add(grp); }
    if (a.prot != null) { const grp = byKey("prot"); if (grp) add(grp); }
    if (a.fruta) add(meal.groups.toggle);
    return { kcal: Math.round(total.kcal), p: Math.round(total.p), c: Math.round(total.c), g: Math.round(total.g) };
  }

  if (!meal.options) return zero;
  const idx = key === "sobremesa" ? picks.sobremesa : picks[key as "cafe" | "lanche" | "jantar"];
  if (idx == null || idx === "none" || idx === "skip") return zero;
  const opt = meal.options[idx as number];
  if (!opt) return zero;
  const portion = key === "cafe" ? picks.cafePortion : key === "lanche" ? picks.lanchePortion : key === "jantar" ? picks.jantarPortion : 1;
  return { kcal: Math.round(opt.kcal * portion), p: Math.round(opt.p * portion), c: Math.round(opt.c * portion), g: Math.round(opt.g * portion) };
}

export function dayTotals(plan: DietPlan, picks: DietDayPicks): MacroValues {
  const total = { kcal: 0, p: 0, c: 0, g: 0 };
  for (const meal of plan.meals) {
    const t = mealTotal(plan, meal.key, picks);
    total.kcal += t.kcal;
    total.p += t.p;
    total.c += t.c;
    total.g += t.g;
  }
  return total;
}

export function isMealDone(meal: DietMeal, picks: DietDayPicks): boolean {
  if (meal.key === "almoco") {
    const a = picks.almoco;
    return a.skipped || (a.carb != null && a.leg != null && a.prot != null);
  }
  const idx = meal.key === "sobremesa" ? picks.sobremesa : picks[meal.key as "cafe" | "lanche" | "jantar"];
  return idx != null;
}

/** A day counts toward the streak once every non-optional meal has a pick (dessert is always optional). */
export function isDayComplete(plan: DietPlan, picks: DietDayPicks): boolean {
  return plan.meals.filter((m) => m.key !== "sobremesa").every((m) => isMealDone(m, picks));
}

export function formatDietDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive complete days ending today (or yesterday, if today isn't complete yet). */
export function getDietStreak(plan: DietPlan, todayPicks: DietDayPicks, history: DietDayLog[]): number {
  const byDate = new Map(history.map((h) => [h.date, h]));
  const today = formatDietDate(new Date());
  let streak = 0;
  const cursor = new Date();
  if (isDayComplete(plan, todayPicks)) {
    streak = 1;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = formatDietDate(cursor);
    if (key === today) break;
    const rec = byDate.get(key);
    if (rec && isDayComplete(plan, rec.picks)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
