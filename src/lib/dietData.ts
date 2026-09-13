import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyDietDay,
  formatDietDate,
  type DietDayLog,
  type DietDayPicks,
  type DietFruitEquivalent,
  type DietMeal,
  type DietMeasurement,
  type DietPlan,
  type DietPlanStatus,
  type DietPlanSummary,
  type DietRecipe,
  type DietShoppingCategory,
  type DietSupplement,
  type DietSupplementGroup,
} from "./diet";

const PLAN_COLUMNS =
  "id, name, status, start_date, end_date, kcal_target, protein_target, carb_target, fat_target, nutri_name, nutri_crn, objective, water_goal, next_consult, general_rules, recipe, fruit_equivalents";

interface PlanRow {
  id: string;
  name: string;
  status: DietPlanStatus;
  start_date: string | null;
  end_date: string | null;
  kcal_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  nutri_name: string | null;
  nutri_crn: string | null;
  objective: string | null;
  water_goal: string | null;
  next_consult: string | null;
  general_rules: string[] | null;
  recipe: DietRecipe | null;
  fruit_equivalents: DietFruitEquivalent[] | null;
}

async function loadPlanChildren(supabase: SupabaseClient, planId: string) {
  const [mealRows, suppRows, suppGroupRows, shopRows] = await Promise.all([
    supabase
      .from("diet_meals")
      .select("id, key, label, kind, order_index, allow_portion, has_none_option, options, groups")
      .eq("plan_id", planId)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_supplements")
      .select("id, key, label, timing, order_index")
      .eq("plan_id", planId)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_supplement_groups")
      .select("id, title, note, order_index, items")
      .eq("plan_id", planId)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_shopping_categories")
      .select("id, name, order_index, items")
      .eq("plan_id", planId)
      .order("order_index", { ascending: true }),
  ]);
  if (mealRows.error) throw mealRows.error;
  if (suppRows.error) throw suppRows.error;
  if (suppGroupRows.error) throw suppGroupRows.error;
  if (shopRows.error) throw shopRows.error;

  const meals: DietMeal[] = (mealRows.data ?? []).map((m) => ({
    id: m.id,
    key: m.key,
    label: m.label,
    kind: m.kind,
    orderIndex: m.order_index,
    allowPortion: m.allow_portion,
    hasNoneOption: m.has_none_option,
    options: m.options,
    groups: m.groups,
  }));

  const supplements: DietSupplement[] = (suppRows.data ?? []).map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    timing: s.timing,
    orderIndex: s.order_index,
  }));

  const supplementGroups: DietSupplementGroup[] = (suppGroupRows.data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    note: g.note,
    orderIndex: g.order_index,
    items: g.items,
  }));

  const shoppingCategories: DietShoppingCategory[] = (shopRows.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    orderIndex: c.order_index,
    items: c.items,
  }));

  return { meals, supplements, supplementGroups, shoppingCategories };
}

function planFromRow(
  row: PlanRow,
  children: Awaited<ReturnType<typeof loadPlanChildren>>
): DietPlan {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    kcalTarget: row.kcal_target,
    proteinTarget: row.protein_target,
    carbTarget: row.carb_target,
    fatTarget: row.fat_target,
    nutriName: row.nutri_name,
    nutriCrn: row.nutri_crn,
    objective: row.objective,
    waterGoal: row.water_goal,
    nextConsult: row.next_consult,
    generalRules: row.general_rules ?? [],
    recipe: row.recipe,
    fruitEquivalents: row.fruit_equivalents ?? [],
    ...children,
  };
}

async function fetchFullPlan(supabase: SupabaseClient, row: PlanRow): Promise<DietPlan> {
  const children = await loadPlanChildren(supabase, row.id);
  return planFromRow(row, children);
}

/**
 * Returns the active diet plan, promoting a scheduled one the same way workout
 * programs do (see getActiveProgram in data.ts) — but date-driven instead of
 * trained-day-driven: if the active plan's end_date has passed, it's marked
 * completed and the oldest scheduled plan (if any) takes over as of today.
 */
export async function getDietPlan(supabase: SupabaseClient): Promise<DietPlan | null> {
  const today = formatDietDate(new Date());

  const { data: activeRow, error: planErr } = await supabase
    .from("diet_plans")
    .select(PLAN_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planErr) throw planErr;
  let planRow = activeRow;

  if (planRow && planRow.end_date && planRow.end_date < today) {
    await supabase.from("diet_plans").update({ status: "completed" }).eq("id", planRow.id);

    const { data: scheduled, error: schedErr } = await supabase
      .from("diet_plans")
      .select(PLAN_COLUMNS)
      .eq("status", "scheduled")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (schedErr) throw schedErr;

    if (scheduled) {
      const { data: promoted, error: promoteErr } = await supabase
        .from("diet_plans")
        .update({ status: "active", start_date: today })
        .eq("id", scheduled.id)
        .select(PLAN_COLUMNS)
        .single();
      if (promoteErr) throw promoteErr;
      planRow = promoted;
    } else {
      planRow = null;
    }
  }

  if (!planRow) return null;
  return fetchFullPlan(supabase, planRow as PlanRow);
}

export async function getScheduledDietPlan(supabase: SupabaseClient): Promise<DietPlan | null> {
  const { data: planRow, error } = await supabase
    .from("diet_plans")
    .select(PLAN_COLUMNS)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!planRow) return null;
  return fetchFullPlan(supabase, planRow as PlanRow);
}

export async function getCompletedDietPlans(supabase: SupabaseClient): Promise<DietPlanSummary[]> {
  const { data, error } = await supabase
    .from("diet_plans")
    .select("id, name, kcal_target, start_date, end_date, status")
    .eq("status", "completed")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    kcalTarget: r.kcal_target,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
  }));
}

/** Display index ("PA1", "PA2"...) for a plan, ordered by creation — mirrors getProgramSequence in data.ts. */
export async function getDietPlanSequence(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("diet_plans").select("id, created_at").order("created_at", { ascending: true });
  if (error) throw error;
  const map = new Map<string, number>();
  (data ?? []).forEach((row, i) => map.set(row.id, i + 1));
  return map;
}

export interface DietPlanFieldsInput {
  name: string;
  kcalTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  nutriName?: string | null;
  nutriCrn?: string | null;
  objective?: string | null;
  waterGoal?: string | null;
  nextConsult?: string | null;
  generalRules?: string[];
  fruitEquivalents?: DietFruitEquivalent[];
  recipe?: DietRecipe | null;
  endDate?: string | null;
}

function fieldsToRow(input: DietPlanFieldsInput) {
  return {
    name: input.name,
    kcal_target: input.kcalTarget,
    protein_target: input.proteinTarget,
    carb_target: input.carbTarget,
    fat_target: input.fatTarget,
    nutri_name: input.nutriName ?? null,
    nutri_crn: input.nutriCrn ?? null,
    objective: input.objective ?? null,
    water_goal: input.waterGoal ?? null,
    next_consult: input.nextConsult ?? null,
    general_rules: input.generalRules ?? [],
    fruit_equivalents: input.fruitEquivalents ?? [],
    recipe: input.recipe ?? null,
    end_date: input.endDate ?? null,
  };
}

/** Creates a new plan (with its 5 fixed meal slots) and makes it active immediately, completing whichever plan was active before. */
export async function createDietPlan(supabase: SupabaseClient, input: DietPlanFieldsInput): Promise<string> {
  await supabase.from("diet_plans").update({ status: "completed" }).eq("status", "active");
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({ ...fieldsToRow(input), status: "active", start_date: formatDietDate(new Date()) })
    .select("id")
    .single();
  if (error) throw error;
  await seedDefaultDietMeals(supabase, data.id);
  return data.id;
}

/** Creates a plan (with its 5 fixed meal slots) that takes over automatically once the active plan's end_date passes (see getDietPlan). */
export async function scheduleDietPlan(supabase: SupabaseClient, input: DietPlanFieldsInput): Promise<string> {
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({
      ...fieldsToRow(input),
      status: "scheduled",
      // Placeholder — overwritten with the real date when promoted to active.
      start_date: formatDietDate(new Date()),
    })
    .select("id")
    .single();
  if (error) throw error;
  await seedDefaultDietMeals(supabase, data.id);
  return data.id;
}

export async function updateDietPlanFields(supabase: SupabaseClient, id: string, input: DietPlanFieldsInput): Promise<void> {
  const { error } = await supabase.from("diet_plans").update(fieldsToRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteDietPlan(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("diet_plans").delete().eq("id", id);
  if (error) throw error;
}

/** Ends the active plan today, regardless of its end_date — the next getDietPlan() call promotes the scheduled one, if any. */
export async function completeDietPlanNow(supabase: SupabaseClient, id: string): Promise<void> {
  const today = formatDietDate(new Date());
  const { error } = await supabase.from("diet_plans").update({ status: "completed", end_date: today }).eq("id", id);
  if (error) throw error;
}

export interface DietMealInput {
  key: string;
  label: string;
  kind: "list" | "builder";
  allowPortion: boolean;
  hasNoneOption: boolean;
  options: DietMeal["options"];
  groups: DietMeal["groups"];
  orderIndex: number;
}

export async function addDietMeal(supabase: SupabaseClient, planId: string, input: DietMealInput): Promise<void> {
  const { error } = await supabase.from("diet_meals").insert({
    plan_id: planId,
    key: input.key,
    label: input.label,
    kind: input.kind,
    order_index: input.orderIndex,
    allow_portion: input.allowPortion,
    has_none_option: input.hasNoneOption,
    options: input.options,
    groups: input.groups,
  });
  if (error) throw error;
}

export async function updateDietMeal(supabase: SupabaseClient, id: string, input: DietMealInput): Promise<void> {
  const { error } = await supabase
    .from("diet_meals")
    .update({
      key: input.key,
      label: input.label,
      kind: input.kind,
      allow_portion: input.allowPortion,
      has_none_option: input.hasNoneOption,
      options: input.options,
      groups: input.groups,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDietMeal(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("diet_meals").delete().eq("id", id);
  if (error) throw error;
}

/**
 * A plan always needs exactly these 5 meal slots — the day-tracking logic
 * (DietDayPicks in diet.ts, MealCard in dietShared.tsx) is hard-wired to these
 * keys, so a new plan can't add/remove meal slots, only edit their content.
 */
export async function seedDefaultDietMeals(supabase: SupabaseClient, planId: string): Promise<void> {
  const { error } = await supabase.from("diet_meals").insert([
    { plan_id: planId, key: "cafe", label: "Café da manhã", kind: "list", order_index: 0, allow_portion: false, has_none_option: false, options: [] },
    {
      plan_id: planId,
      key: "almoco",
      label: "Almoço",
      kind: "builder",
      order_index: 1,
      allow_portion: false,
      has_none_option: false,
      groups: { radioGroups: [], toggle: { key: "fruta", label: "Fruta", kcal: 0, p: 0, c: 0, g: 0 } },
    },
    { plan_id: planId, key: "lanche", label: "Lanche", kind: "list", order_index: 2, allow_portion: false, has_none_option: false, options: [] },
    { plan_id: planId, key: "jantar", label: "Jantar", kind: "list", order_index: 3, allow_portion: false, has_none_option: false, options: [] },
    { plan_id: planId, key: "sobremesa", label: "Sobremesa", kind: "list", order_index: 4, allow_portion: false, has_none_option: true, options: [] },
  ]);
  if (error) throw error;
}

export interface DietSupplementInput {
  key: string;
  label: string;
  timing: string | null;
  orderIndex: number;
}

export async function addDietSupplement(supabase: SupabaseClient, planId: string, input: DietSupplementInput): Promise<void> {
  const { error } = await supabase
    .from("diet_supplements")
    .insert({ plan_id: planId, key: input.key, label: input.label, timing: input.timing, order_index: input.orderIndex });
  if (error) throw error;
}

export async function updateDietSupplement(supabase: SupabaseClient, id: string, input: DietSupplementInput): Promise<void> {
  const { error } = await supabase
    .from("diet_supplements")
    .update({ key: input.key, label: input.label, timing: input.timing })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDietSupplement(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("diet_supplements").delete().eq("id", id);
  if (error) throw error;
}

export interface DietSupplementGroupInput {
  title: string;
  note: string | null;
  items: { name: string; dose: string }[];
  orderIndex: number;
}

export async function addDietSupplementGroup(supabase: SupabaseClient, planId: string, input: DietSupplementGroupInput): Promise<void> {
  const { error } = await supabase
    .from("diet_supplement_groups")
    .insert({ plan_id: planId, title: input.title, note: input.note, items: input.items, order_index: input.orderIndex });
  if (error) throw error;
}

export async function updateDietSupplementGroup(supabase: SupabaseClient, id: string, input: DietSupplementGroupInput): Promise<void> {
  const { error } = await supabase
    .from("diet_supplement_groups")
    .update({ title: input.title, note: input.note, items: input.items })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDietSupplementGroup(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("diet_supplement_groups").delete().eq("id", id);
  if (error) throw error;
}

export interface DietShoppingCategoryInput {
  name: string;
  items: string[];
  orderIndex: number;
}

export async function addDietShoppingCategory(supabase: SupabaseClient, planId: string, input: DietShoppingCategoryInput): Promise<void> {
  const { error } = await supabase
    .from("diet_shopping_categories")
    .insert({ plan_id: planId, name: input.name, items: input.items, order_index: input.orderIndex });
  if (error) throw error;
}

export async function updateDietShoppingCategory(supabase: SupabaseClient, id: string, input: DietShoppingCategoryInput): Promise<void> {
  const { error } = await supabase.from("diet_shopping_categories").update({ name: input.name, items: input.items }).eq("id", id);
  if (error) throw error;
}

export async function deleteDietShoppingCategory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("diet_shopping_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function getDietDayLogs(supabase: SupabaseClient): Promise<DietDayLog[]> {
  const { data, error } = await supabase
    .from("diet_day_logs")
    .select("date, picks, supplements")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    date: row.date,
    picks: row.picks as DietDayPicks,
    supplements: (row.supplements as Record<string, boolean>) ?? {},
  }));
}

export async function getTodayDietLog(supabase: SupabaseClient): Promise<DietDayLog> {
  const today = formatDietDate(new Date());
  const { data, error } = await supabase
    .from("diet_day_logs")
    .select("date, picks, supplements")
    .eq("date", today)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { date: today, picks: emptyDietDay(), supplements: {} };
  return { date: data.date, picks: data.picks as DietDayPicks, supplements: (data.supplements as Record<string, boolean>) ?? {} };
}

export async function saveTodayDietLog(
  supabase: SupabaseClient,
  picks: DietDayPicks,
  supplements: Record<string, boolean>
): Promise<void> {
  const today = formatDietDate(new Date());
  const { error } = await supabase
    .from("diet_day_logs")
    .upsert({ date: today, picks, supplements, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function getDietMeasurements(supabase: SupabaseClient): Promise<DietMeasurement[]> {
  const { data, error } = await supabase
    .from("diet_measurements")
    .select("id, date, weight, waist, hip, arm, thigh")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    weight: row.weight,
    waist: row.waist,
    hip: row.hip,
    arm: row.arm,
    thigh: row.thigh,
  }));
}

export async function addDietMeasurement(
  supabase: SupabaseClient,
  input: { weight: number | null; waist: number | null; hip: number | null; arm: number | null; thigh: number | null }
): Promise<DietMeasurement> {
  const { data, error } = await supabase
    .from("diet_measurements")
    .insert(input)
    .select("id, date, weight, waist, hip, arm, thigh")
    .single();
  if (error) throw error;
  return data;
}

export async function getDietShoppingState(supabase: SupabaseClient): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from("diet_shopping_state").select("item_key, checked");
  if (error) throw error;
  const state: Record<string, boolean> = {};
  for (const row of data ?? []) state[row.item_key] = row.checked;
  return state;
}

export async function setDietShoppingItem(supabase: SupabaseClient, itemKey: string, checked: boolean): Promise<void> {
  const { error } = await supabase.from("diet_shopping_state").upsert({ item_key: itemKey, checked }, { onConflict: "user_id,item_key" });
  if (error) throw error;
}

export async function clearDietShoppingState(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("diet_shopping_state").delete().neq("item_key", "");
  if (error) throw error;
}
