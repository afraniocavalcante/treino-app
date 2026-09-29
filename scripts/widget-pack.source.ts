// Fonte de /api/widget-pack — marca "fiz a mala" pra uma viagem (mesmos
// comentários sobre bundling/autenticação de widget-data.source.ts valem
// aqui). Diferente de widget-toggle: isso não alterna todo dia, é uma
// tarefa única por viagem (ver shouldPackFor em src/lib/travel.ts) — só
// marca como feita, não tem "desmarcar" pelo widget.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { setMalaFeita } from "../src/lib/travelData";

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

  const tripId = typeof req.body?.tripId === "string" ? req.body.tripId : null;
  if (!tripId) {
    res.status(400).json({ error: "missing_tripId" });
    return;
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await setMalaFeita(supabase, tripId, true);
    res.status(200).json({ ok: true, tripId });
  } catch (err) {
    console.error("[widget-pack] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
