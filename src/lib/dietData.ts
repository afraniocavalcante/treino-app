import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyDietDay,
  formatDietDate,
  type DietDayLog,
  type DietDayPicks,
  type DietMeal,
  type DietMeasurement,
  type DietPlan,
  type DietShoppingCategory,
  type DietSupplement,
  type DietSupplementGroup,
} from "./diet";

export async function getDietPlan(supabase: SupabaseClient): Promise<DietPlan | null> {
  const { data: planRow, error: planErr } = await supabase
    .from("diet_plans")
    .select(
      "id, name, kcal_target, protein_target, carb_target, fat_target, nutri_name, nutri_crn, objective, water_goal, next_consult, general_rules, recipe, fruit_equivalents"
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planErr) throw planErr;
  if (!planRow) return null;

  const [mealRows, suppRows, suppGroupRows, shopRows] = await Promise.all([
    supabase
      .from("diet_meals")
      .select("id, key, label, kind, order_index, allow_portion, has_none_option, options, groups")
      .eq("plan_id", planRow.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_supplements")
      .select("id, key, label, timing, order_index")
      .eq("plan_id", planRow.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_supplement_groups")
      .select("id, title, note, order_index, items")
      .eq("plan_id", planRow.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("diet_shopping_categories")
      .select("id, name, order_index, items")
      .eq("plan_id", planRow.id)
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

  return {
    id: planRow.id,
    name: planRow.name,
    kcalTarget: planRow.kcal_target,
    proteinTarget: planRow.protein_target,
    carbTarget: planRow.carb_target,
    fatTarget: planRow.fat_target,
    nutriName: planRow.nutri_name,
    nutriCrn: planRow.nutri_crn,
    objective: planRow.objective,
    waterGoal: planRow.water_goal,
    nextConsult: planRow.next_consult,
    generalRules: planRow.general_rules ?? [],
    recipe: planRow.recipe,
    fruitEquivalents: planRow.fruit_equivalents ?? [],
    meals,
    supplements,
    supplementGroups,
    shoppingCategories,
  };
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
