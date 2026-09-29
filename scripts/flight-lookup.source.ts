// Fonte de /api/flight-lookup — proxy pro AviationStack, chamado pelo
// formulário de adicionar voo (src/app/travel). Não é do trio/quinteto do
// widget (não usa WIDGET_API_KEY): quem chama isso é o app principal, já
// autenticado pela própria sessão do Supabase do usuário, então a
// autenticação aqui verifica ESSE token — não uma chave fixa.
//
// Por que isso não pode rodar no navegador direto: a chave do AviationStack
// (AVIATIONSTACK_API_KEY) ficaria visível pra qualquer um inspecionando a
// rede do app, já que o resto do site é 100% estático (sem servidor pra
// esconder nada do lado do cliente). Mesmo bundling via esbuild em
// scripts/deploy.mjs que os outros /api/* já usam — ver o comentário em
// widget-data.source.ts pra por que isso é necessário.
//
// AviationStack: o plano gratuito bloqueia o parâmetro `flight_date` no
// endpoint /flights (só serve voos de HOJE) — testado e confirmado. O
// endpoint /flightsFuture, que ESSE plano aceita, funciona diferente: pede
// aeroporto + data (não número de voo direto) e devolve todos os voos
// daquele aeroporto naquele dia, que a gente filtra aqui pelo número do voo.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

interface AviationStackFutureFlight {
  weekday?: string;
  departure?: { iataCode?: string; icaoCode?: string; terminal?: string | null; gate?: string | null; scheduledTime?: string };
  arrival?: { iataCode?: string; icaoCode?: string; terminal?: string | null; gate?: string | null; scheduledTime?: string };
  airline?: { name?: string; iataCode?: string };
  flight?: { number?: string; iataNumber?: string; icaoNumber?: string };
}

function normalizeFlightNumber(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// AviationStack devolve a hora local do aeroporto sem fuso ("2026-12-22
// 21:00:00", sem "Z") — não dá pra confiar nisso como UTC. O app guarda
// timestamps com fuso (timestamptz), então melhor não inventar um fuso
// errado: manda como está (o Postgres/JS vai tratar como local do servidor,
// que é aceitável pro caso de uso — o usuário sempre pode ajustar no
// formulário manual, que continua existindo como fallback).
function toIso(dateTimeNoZone: string | undefined): string | null {
  if (!dateTimeNoZone) return null;
  const iso = dateTimeNoZone.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Diferente dos endpoints do widget (chamados por Swift/URLSession, onde
  // CORS não existe), isso é chamado de dentro do WebView do app — via
  // fetch() do navegador — que SEMPRE aplica CORS num pedido cross-origin
  // (o app carrega de capacitor://localhost ou de outro domínio, nunca do
  // domínio de produção). Sem isso, o navegador manda um OPTIONS de
  // pre-flight, não recebe os headers certos, e nunca chega a mandar o GET
  // de verdade — era exatamente o erro reportado, confirmado pelos logs (só
  // OPTIONS, nenhum GET).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const flightNumber = typeof req.query.flightNumber === "string" ? req.query.flightNumber : null;
  const departureIata = typeof req.query.departureIata === "string" ? req.query.departureIata : null;
  const date = typeof req.query.date === "string" ? req.query.date : null; // YYYY-MM-DD
  if (!flightNumber || !departureIata || !date) {
    res.status(400).json({ error: "missing_params", required: ["flightNumber", "departureIata", "date"] });
    return;
  }

  if (!process.env.AVIATIONSTACK_API_KEY) {
    res.status(500).json({ error: "aviationstack_not_configured" });
    return;
  }

  try {
    const url = new URL("https://api.aviationstack.com/v1/flightsFuture");
    url.searchParams.set("access_key", process.env.AVIATIONSTACK_API_KEY);
    url.searchParams.set("iataCode", departureIata.toUpperCase());
    url.searchParams.set("type", "departure");
    url.searchParams.set("date", date);

    const resp = await fetch(url.toString());
    const body = (await resp.json()) as { data?: AviationStackFutureFlight[]; error?: { code: string; message: string } };
    if (body.error) {
      // "rate_limit_reached" é um limite de taxa próprio do AviationStack
      // (por minuto/hora), separado da cota de 100/mês — vale destacar isso
      // pro cliente pra não parecer um erro genérico quebrado.
      const isRateLimit = body.error.code === "rate_limit_reached";
      res.status(502).json({ error: isRateLimit ? "aviationstack_rate_limited" : "aviationstack_error", detail: body.error });
      return;
    }

    const wanted = normalizeFlightNumber(flightNumber);
    const match = (body.data ?? []).find((f) => {
      const candidates = [f.flight?.iataNumber, f.flight?.icaoNumber, f.flight?.number ? `${f.airline?.iataCode ?? ""}${f.flight.number}` : null];
      return candidates.some((c) => c && normalizeFlightNumber(c) === wanted);
    });

    if (!match) {
      res.status(404).json({ error: "flight_not_found" });
      return;
    }

    res.status(200).json({
      carrier: match.airline?.name ?? "",
      flightNumber: match.flight?.iataNumber ?? flightNumber,
      originIata: match.departure?.iataCode?.toUpperCase() ?? departureIata.toUpperCase(),
      originTerminal: match.departure?.terminal ?? null,
      destIata: match.arrival?.iataCode?.toUpperCase() ?? null,
      destTerminal: match.arrival?.terminal ?? null,
      departureAt: toIso(match.departure?.scheduledTime),
      arrivalAt: toIso(match.arrival?.scheduledTime),
    });
  } catch (err) {
    console.error("[flight-lookup] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
