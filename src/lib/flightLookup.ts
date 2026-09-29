import type { SupabaseClient } from "@supabase/supabase-js";

// Sempre a URL absoluta de produção, nunca relativa: quando isso roda dentro
// do app nativo (Capacitor), o JS é carregado de um esquema local
// (capacitor://...), não do domínio real — um fetch relativo cairia no
// lugar errado. Mesma razão pela qual o widget usa URL absoluta.
const BASE_URL = "https://treino-app-snowy.vercel.app";

export interface FlightLookupResult {
  carrier: string;
  flightNumber: string;
  originIata: string;
  originTerminal: string | null;
  destIata: string | null;
  destTerminal: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
}

export type FlightLookupOutcome = { status: "found"; flight: FlightLookupResult } | { status: "not_found" } | { status: "error"; message: string };

/** Busca um voo futuro pelo número + aeroporto de origem + data via
 * /api/flight-lookup (proxy pro AviationStack — ver o comentário em
 * scripts/flight-lookup.source.ts pra por que precisa passar pelo servidor). */
export async function lookupFlight(
  supabase: SupabaseClient,
  params: { flightNumber: string; departureIata: string; date: string }
): Promise<FlightLookupOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { status: "error", message: "Sessão expirada — recarregue o app." };

  const url = new URL(`${BASE_URL}/api/flight-lookup`);
  url.searchParams.set("flightNumber", params.flightNumber);
  url.searchParams.set("departureIata", params.departureIata);
  url.searchParams.set("date", params.date);

  try {
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.error === "aviationstack_rate_limited") {
        return { status: "error", message: "Limite de requisições da API atingido — espera alguns minutos e tenta de novo." };
      }
      return { status: "error", message: "Falha ao buscar o voo." };
    }
    const flight = (await res.json()) as FlightLookupResult;
    return { status: "found", flight };
  } catch {
    return { status: "error", message: "Falha ao buscar o voo — verifique a conexão." };
  }
}
