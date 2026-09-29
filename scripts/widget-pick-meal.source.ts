// Fonte de /api/widget-pick-meal — terceira função do trio do widget, junto
// com widget-data e widget-toggle (mesmos comentários sobre bundling e
// autenticação valem aqui, ver widget-data.source.ts).
//
// Só refeições kind:"list" (café, lanche, jantar, sobremesa) — almoço é
// kind:"builder" (grupos de rádio: carbo/legume/proteína + fruta opcional) e
// nunca aparece com `options` no payload de widget-data, então o widget nunca
// deveria mandar essa key aqui. A whitelist abaixo é o cinto e suspensório.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getTodayDietLog, saveTodayDietLog } from "../src/lib/dietData";
import type { DietDayPicks } from "../src/lib/diet";

const PICKABLE_MEAL_KEYS = new Set(["cafe", "lanche", "jantar", "sobremesa"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || (req.query.key as string | undefined);
  if (!process.env.WIDGET_API_KEY || provided !== process.env.WIDGET_API_KEY) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const mealKey = typeof req.body?.mealKey === "string" ? req.body.mealKey : null;
  const optionIndex = typeof req.body?.optionIndex === "number" ? req.body.optionIndex : null;
  if (!mealKey || !PICKABLE_MEAL_KEYS.has(mealKey) || optionIndex === null) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    const userId = usersPage.users[0]?.id;
    if (!userId) throw new Error("no user found");

    const today = await getTodayDietLog(supabase);
    const picks: DietDayPicks = { ...today.picks };
    // mealKey já passou pela whitelist acima (cafe/lanche/jantar/sobremesa),
    // que são exatamente os 4 campos de DietDayPicks com esse formato
    // (number | "skip" | "custom" | null, +"none" em sobremesa) — o cast é
    // só pra driblar o TS não conseguir provar isso a partir de uma string.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (picks as any)[mealKey] = optionIndex;

    await saveTodayDietLog(supabase, picks, today.supplements, userId);

    res.status(200).json({ ok: true, mealKey, optionIndex });
  } catch (err) {
    console.error("[widget-pick-meal] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
