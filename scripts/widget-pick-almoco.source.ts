// Fonte de /api/widget-pick-almoco — quarta função do trio+um do widget
// (junto com widget-data, widget-toggle, widget-pick-meal; mesmos
// comentários sobre bundling/autenticação em widget-data.source.ts).
//
// Almoço é a única refeição "builder" hoje: em vez de um índice só (como
// widget-pick-meal), o app grava um objeto com uma escolha por grupo de
// rádio (carb/leg/prot) + o extra opcional (fruta) — ver AlmocoPicks em
// src/lib/diet.ts. O widget já percorreu os grupos um de cada vez (ver
// AlmocoWizard.swift) e só chama isso no passo final, com tudo junto.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getTodayDietLog, saveTodayDietLog } from "../src/lib/dietData";
import type { DietDayPicks } from "../src/lib/diet";

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

  const carb = typeof req.body?.carb === "number" ? req.body.carb : null;
  const leg = typeof req.body?.leg === "number" ? req.body.leg : null;
  const prot = typeof req.body?.prot === "number" ? req.body.prot : null;
  const fruta = typeof req.body?.fruta === "boolean" ? req.body.fruta : false;
  if (carb === null || leg === null || prot === null) {
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
    const picks: DietDayPicks = { ...today.picks, almoco: { carb, leg, prot, fruta, skipped: false, custom: false } };
    await saveTodayDietLog(supabase, picks, today.supplements, userId);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[widget-pick-almoco] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
