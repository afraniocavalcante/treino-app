// Fonte de /api/widget-toggle — a metade "grava" do par com widget-data.
// Mesmo motivo de existir fora de src/app, mesmo esquema de bundling via
// esbuild em scripts/deploy.mjs e mesma autenticação por chave fixa: ver os
// comentários em scripts/widget-data.source.ts, valem aqui também.
//
// Só suplementos têm um toggle "concluir direto do widget" — é a única
// categoria de evento que já é um booleano puro no modelo de dados
// (supplements[key]). Refeição precisa escolher uma opção de comida
// (MealCard inteiro) e treino precisa de uma sessão de verdade com
// exercícios; nenhum dos dois vira um "toque e pronto" sem abrir o app.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getTodayDietLog, saveTodayDietLog } from "../src/lib/dietData";

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

  const supplementKey = typeof req.body?.supplementKey === "string" ? req.body.supplementKey : null;
  if (!supplementKey) {
    res.status(400).json({ error: "missing_supplementKey" });
    return;
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Service role não tem sessão — sem isso, "default auth.uid()" na coluna
    // user_id fica null e o upsert quebra a constraint not-null. App de uso
    // pessoal (um usuário só, mesma premissa de widget-data.source.ts).
    const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    const userId = usersPage.users[0]?.id;
    if (!userId) throw new Error("no user found");

    const today = await getTodayDietLog(supabase);
    const nextDone = !today.supplements[supplementKey];
    const supplements = { ...today.supplements, [supplementKey]: nextDone };
    await saveTodayDietLog(supabase, today.picks, supplements, userId);

    res.status(200).json({ ok: true, supplementKey, done: nextDone });
  } catch (err) {
    console.error("[widget-toggle] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
