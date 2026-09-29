// Fonte do endpoint dedicado ao widget de iPhone do Personal OS (ver
// ios/App/PersonalOSWidget). Não fica em src/app de propósito: next.config.ts
// usa output:"export" (site 100% estático, embarcado no app via Capacitor),
// então uma rota dinâmica dentro do App Router não teria como rodar em
// produção. Em vez disso isso vira uma Serverless Function do Vercel à parte
// (formato clássico /api/*.js na raiz do projeto) — mesmo deploy, dois mundos.
//
// Este arquivo não é o que é deployado diretamente: scripts/deploy.mjs
// empacota ele com esbuild pra api/widget-data.js antes de buildar (--bundle
// inlina os imports de src/lib inteiros num único arquivo CJS). Foi preciso
// porque o builder de Functions do Vercel não faz esse bundling sozinho pra
// TS solto em /api — só copia os arquivos importados como estão, sem
// resolver extensão, o que quebra em runtime ESM. api/widget-data.js (gerado)
// fica fora do git — só a fonte aqui é versionada.
//
// Autenticação: chave fixa (WIDGET_API_KEY) em vez do token de sessão do
// usuário — o widget não teria como renovar esse token sozinho quando expira.
// Sem RLS: usa a service role porque não existe sessão de usuário aqui; como o
// projeto é de uso pessoal (um usuário só), as mesmas queries que o app usa
// com RLS bastam sem precisar filtrar por user_id explicitamente.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getActiveProgram, getHistory } from "../src/lib/data";
import { formatDate, isRestDay } from "../src/lib/program";
import { getDietPlan, getDietDayLogs, getTodayDietLog } from "../src/lib/dietData";
import { isMealDone, isDayFullyComplete } from "../src/lib/diet";
import { getPerfectStreak } from "../src/lib/insights";
import { getTrips, getAllFlights } from "../src/lib/travelData";
import { nextTripNeedingPack, pickActiveFlight, tripDaysAway } from "../src/lib/travel";

// Placeholder fixo — mesmo valor usado em src/app/os/Today.tsx (não existe
// (ainda) horário configurável pro treino do dia).
const TREINO_TIME = "18:00";

type WidgetEvent = {
  time: string;
  title: string;
  sub: string;
  kind: "treino" | "meal" | "suplemento" | "mala";
  done: boolean;
  /** Suplemento: a key que /api/widget-toggle espera de volta.
   *  Refeição "list" pendente: a key que /api/widget-pick-meal espera de volta.
   *  Refeição "builder" (almoço) pendente: a própria key ("almoco").
   *  Mala pendente: o id da viagem, que /api/widget-pack espera de volta.
   *  Fora isso (treino, já concluída): null. */
  key: string | null;
  /** Só em refeições "list" pendentes — os rótulos das opções, na ordem que
   *  /api/widget-pick-meal espera o optionIndex de volta. */
  options: string[] | null;
  /** Só em refeições "builder" pendentes (hoje: só almoço) — os grupos de
   *  rádio na ordem em que o widget mostra um de cada vez (carboidrato,
   *  depois leguminosa, depois proteína...). /api/widget-pick-almoco espera
   *  de volta um índice por grupo, na mesma ordem. */
  builderGroups: { key: string; title: string; items: string[] }[] | null;
  /** Só quando a refeição builder tem um extra opcional tipo "+ Fruta" — o
   *  rótulo pra mostrar no passo final de sim/não. */
  builderExtraLabel: string | null;
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || (req.query.key as string | undefined);
  if (!process.env.WIDGET_API_KEY || provided !== process.env.WIDGET_API_KEY) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const [program, history, dietPlan, todayLog, dietHistory, trips, flights] = await Promise.all([
      getActiveProgram(supabase),
      getHistory(supabase),
      getDietPlan(supabase),
      getTodayDietLog(supabase),
      getDietDayLogs(supabase),
      getTrips(supabase),
      getAllFlights(supabase),
    ]);

    const now = new Date();
    const todayStr = formatDate(now);
    const todayPicks = todayLog.picks;
    const todaySupplements = todayLog.supplements;

    const trainedToday = history.some((e) => e.date === todayStr);
    const trainedDates = new Set(history.map((e) => e.date));
    const dietedDates = new Set(
      dietHistory.filter((h) => dietPlan && isDayFullyComplete(dietPlan, h.picks, h.supplements)).map((h) => h.date)
    );
    const todayFullyDone = !!dietPlan && isDayFullyComplete(dietPlan, todayPicks, todaySupplements);
    if (todayFullyDone) dietedDates.add(todayStr);
    const perfectStreak = getPerfectStreak(trainedDates, dietedDates);

    const restToday = program ? isRestDay(program, history, todayStr) : false;

    const requiredMeals = dietPlan ? dietPlan.meals.filter((m) => m.key !== "sobremesa") : [];
    const mealsDone = requiredMeals.filter((m) => isMealDone(m, todayPicks)).length;
    const suppTotal = dietPlan ? dietPlan.supplements.length : 0;
    const suppDone = dietPlan ? dietPlan.supplements.filter((s) => todaySupplements[s.key]).length : 0;
    const treinoDoneFrac = restToday || trainedToday ? 1 : 0;

    const events: WidgetEvent[] = [];
    if (dietPlan) {
      for (const meal of dietPlan.meals) {
        if (!meal.scheduledTime) continue;
        const done = isMealDone(meal, todayPicks);
        const pickableList = meal.kind === "list" && !done;
        const pickableBuilder = meal.kind === "builder" && !done;
        events.push({
          time: meal.scheduledTime,
          title: meal.label,
          sub: done ? "Concluída" : "Toque para escolher",
          kind: "meal",
          done,
          key: pickableList || pickableBuilder ? meal.key : null,
          options: pickableList && meal.options ? meal.options.map((o) => o.label) : null,
          builderGroups: pickableBuilder && meal.groups ? meal.groups.radioGroups.map((g) => ({ key: g.key, title: g.title, items: g.items })) : null,
          builderExtraLabel: pickableBuilder && meal.groups ? meal.groups.toggle.label : null,
        });
      }
      for (const supp of dietPlan.supplements) {
        if (!supp.scheduledTime) continue;
        events.push({ time: supp.scheduledTime, title: supp.label, sub: supp.timing ?? "Suplemento", kind: "suplemento", done: !!todaySupplements[supp.key], key: supp.key, options: null, builderGroups: null, builderExtraLabel: null });
      }
    }
    const packTrip = nextTripNeedingPack(trips, flights, now);
    if (packTrip) {
      events.push({
        time: "08:00",
        title: `Fazer a mala · ${packTrip.city}`,
        sub: "Toque pra marcar quando fizer",
        kind: "mala",
        done: false,
        key: packTrip.id,
        options: null,
        builderGroups: null,
        builderExtraLabel: null,
      });
    }
    if (program && !restToday) {
      const workoutName = program.workouts.length > 0 ? program.workouts[0].name : null;
      events.push({
        time: TREINO_TIME,
        title: workoutName ? `Treino · ${workoutName}` : "Treino",
        sub: trainedToday ? "Concluído" : "Toque pra treinar",
        kind: "treino",
        done: trainedToday,
        key: null,
        options: null,
        builderGroups: null,
        builderExtraLabel: null,
      });
    }
    const pending = events.filter((e) => !e.done).sort((a, b) => toMin(a.time) - toMin(b.time));

    const activeFlight = pickActiveFlight(flights, now);
    const activeTrip = activeFlight ? trips.find((t) => t.id === activeFlight.flight.tripId) ?? null : null;

    res.status(200).json({
      generatedAt: now.toISOString(),
      rings: {
        treino: { done: treinoDoneFrac, total: 1 },
        refeicoes: { done: mealsDone, total: Math.max(1, requiredMeals.length) },
        suplementos: { done: suppDone, total: Math.max(1, suppTotal) },
      },
      streak: { days: perfectStreak, todayFullyDone },
      trip:
        activeFlight && activeTrip
          ? {
              city: activeTrip.city,
              daysAway: tripDaysAway(activeTrip, now),
              carrier: activeFlight.flight.carrier,
              flightNumber: activeFlight.flight.flightNumber,
            }
          : null,
      events: pending.slice(0, 6),
    });
  } catch (err) {
    console.error("[widget-data] failed", err);
    res.status(500).json({ error: "internal_error" });
  }
}
