"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllFlights, getTrips } from "@/lib/travelData";
import { pickActiveFlight, tripDaysAway, type Flight, type Trip } from "@/lib/travel";
import { isMealDone, type DietDayPicks, type DietMeal, type DietPlan } from "@/lib/diet";
import type { Program } from "@/lib/program";
import { MealCard } from "../dietShared";
import { OS_APPS, type OSApp } from "./Dock";

// Não existe (ainda) um horário configurável pro treino do dia — placeholder
// fixo, mesmo espírito do handoff, até isso ganhar um campo de verdade.
const TREINO_TIME = "18:00";

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

type TimelineRow =
  | { kind: "meal"; time: string; done: boolean; meal: DietMeal }
  | {
      kind: "generic";
      time: string;
      title: string;
      sub: string;
      icon: string;
      bg: string;
      fg: string;
      done: boolean;
      checkable: boolean;
      cta: string | null;
      onOpen: () => void;
      onToggle?: () => void;
    };

export default function Today({
  supabase,
  program,
  dietPlan,
  todayPicks,
  todaySupplements,
  restToday,
  trainedToday,
  perfectStreak,
  todayFullyDone,
  offline,
  deload,
  onOpenApp,
  onOpenTreino,
  onToggleSupplement,
  onPersistPicks,
}: {
  supabase: SupabaseClient;
  program: Program | null;
  dietPlan: DietPlan | null;
  todayPicks: DietDayPicks;
  todaySupplements: Record<string, boolean>;
  restToday: boolean;
  trainedToday: boolean;
  perfectStreak: number;
  todayFullyDone: boolean;
  offline: boolean;
  deload: boolean;
  onOpenApp: (app: OSApp) => void;
  onOpenTreino: () => void;
  onToggleSupplement: (key: string) => void;
  onPersistPicks: (next: DietDayPicks) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, f] = await Promise.all([getTrips(supabase), getAllFlights(supabase)]);
        if (!cancelled) {
          setTrips(t);
          setFlights(f);
        }
      } catch (err) {
        console.error("Falha ao carregar viagens em Hoje:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFlight = pickActiveFlight(flights, now);
  const activeTrip = activeFlight ? trips.find((t) => t.id === activeFlight.flight.tripId) ?? null : null;

  const requiredMeals = dietPlan ? dietPlan.meals.filter((m) => m.key !== "sobremesa") : [];
  const mealsDone = requiredMeals.filter((m) => isMealDone(m, todayPicks)).length;
  const suppTotal = dietPlan ? dietPlan.supplements.length : 0;
  const suppDone = dietPlan ? dietPlan.supplements.filter((s) => todaySupplements[s.key]).length : 0;
  const treinoDoneFrac = restToday || trainedToday ? 1 : 0;

  const rings: { name: string; color: string; frac: number; total: number; onOpen: () => void }[] = [
    { name: "Treino", color: "#1C1C1E", frac: treinoDoneFrac, total: 1, onOpen: () => onOpenApp("treino") },
    { name: "Refeições", color: "#C97B4A", frac: mealsDone, total: Math.max(1, requiredMeals.length), onOpen: () => onOpenApp("dieta") },
    { name: "Suplementos", color: "#CFA85F", frac: suppDone, total: Math.max(1, suppTotal), onOpen: () => onOpenApp("dieta") },
  ];

  const events: TimelineRow[] = [];
  if (dietPlan) {
    for (const meal of dietPlan.meals) {
      if (!meal.scheduledTime) continue;
      events.push({ kind: "meal", time: meal.scheduledTime, done: isMealDone(meal, todayPicks), meal });
    }
    for (const supp of dietPlan.supplements) {
      if (!supp.scheduledTime) continue;
      const done = !!todaySupplements[supp.key];
      events.push({
        kind: "generic",
        time: supp.scheduledTime,
        title: supp.label,
        sub: supp.timing ?? "Suplemento",
        icon: "ph-pill",
        bg: OS_APPS.dieta.bg,
        fg: OS_APPS.dieta.fg,
        done,
        checkable: true,
        cta: null,
        onOpen: () => onOpenApp("dieta"),
        onToggle: () => onToggleSupplement(supp.key),
      });
    }
  }
  if (program && !restToday) {
    const done = trainedToday;
    events.push({
      kind: "generic",
      time: TREINO_TIME,
      title: program.workouts.length > 0 ? `Treino · ${program.workouts[0].name}` : "Treino",
      sub: done ? "Concluído" : "Toque pra treinar",
      icon: "ph-barbell",
      bg: OS_APPS.treino.bg,
      fg: OS_APPS.treino.fg,
      done,
      checkable: false,
      cta: done ? null : "Treinar",
      onOpen: onOpenTreino,
    });
  }

  // Concluídos descem pro fim da lista, fora da ordem cronológica — só o
  // que ainda falta faz sentido posicionar em relação ao "agora".
  const byTime = (a: TimelineRow, b: TimelineRow) => toMin(a.time) - toMin(b.time);
  const pending = events.filter((e) => !e.done).sort(byTime);
  const completed = events.filter((e) => e.done).sort(byTime);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  let nowInserted = false;
  const timeline: ({ isNow: true } | ({ isNow: false } & TimelineRow))[] = [];
  for (const e of pending) {
    if (!nowInserted && toMin(e.time) > nowMin) {
      timeline.push({ isNow: true });
      nowInserted = true;
    }
    timeline.push({ isNow: false, ...e });
  }
  if (!nowInserted) timeline.push({ isNow: true });
  for (const e of completed) timeline.push({ isNow: false, ...e });

  const streakLine = todayFullyDone ? `${perfectStreak + 1} dias perfeitos seguidos` : `${perfectStreak} dias perfeitos · feche hoje para ${perfectStreak + 1}`;

  const rawDayLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const dayLabel = rawDayLabel.charAt(0).toUpperCase() + rawDayLabel.slice(1);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "calc(20px + env(safe-area-inset-top, 0px)) 16px calc(150px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "6px 6px 4px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#57534E" }}>{dayLabel}</span>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.15 }}>Bom dia, Afrânio</span>
      </div>

      {offline && (
        <div style={{ padding: "10px 14px", borderRadius: 16, background: "rgba(255,255,255,.4)", border: "1px solid rgba(255,255,255,.5)", fontSize: 12, color: "#57534E", lineHeight: 1.5 }}>
          📡 Sem conexão — modo de visualização, mudanças não serão salvas agora.
        </div>
      )}

      {deload && (
        <div style={{ padding: "9px 13px", borderRadius: 14, background: "rgba(255,255,255,.4)", border: "1px solid rgba(207,168,95,.5)", borderLeft: "3px solid #CFA85F", fontSize: 11.5, color: "#57534E", lineHeight: 1.4 }}>
          Semana de deload no treino — pode valer manter ou subir levemente as kcal essa semana.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 8,
          padding: "16px 10px",
          borderRadius: 26,
          background: "rgba(255,255,255,.3)",
          backdropFilter: "blur(14px) saturate(1.8)",
          WebkitBackdropFilter: "blur(14px) saturate(1.8)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 1px rgba(255,255,255,.35), 0 0 0 .5px rgba(255,255,255,.5), 0 12px 30px -14px rgba(80,45,20,.35)",
        }}
      >
        {rings.map((r) => {
          const deg = Math.round((r.frac / r.total) * 360);
          return (
            <button
              key={r.name}
              onClick={r.onOpen}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `conic-gradient(${r.color} ${deg}deg, rgba(28,28,30,.1) 0)`, display: "grid", placeItems: "center", transition: "background .3s" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,250,244,.92)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {r.frac}/{r.total}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#44403C" }}>{r.name}</span>
            </button>
          );
        })}
      </div>

      {activeFlight && activeTrip && (
        <button
          onClick={() => onOpenApp("viagens")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            border: 0,
            borderRadius: 24,
            background: "rgba(255,255,255,.3)",
            backdropFilter: "blur(14px) saturate(1.8)",
            WebkitBackdropFilter: "blur(14px) saturate(1.8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 1px rgba(255,255,255,.35), 0 0 0 .5px rgba(255,255,255,.5), 0 12px 30px -14px rgba(80,45,20,.35)",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, display: "grid", placeItems: "center", background: "linear-gradient(160deg,#FFFFFF,#E3E0E0)", boxShadow: "0 1px 3px rgba(28,28,30,.2)", color: "#0088b0", fontSize: 22 }}>
            <i className="ph-fill ph-airplane-tilt" />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#57534E" }}>Dia todo · Viagens</span>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{activeTrip.city} em {tripDaysAway(activeTrip, now)} dias</span>
            <span style={{ fontSize: 13, color: "#57534E" }}>{activeFlight.flight.carrier} · {activeFlight.flight.flightNumber}</span>
          </div>
          <i className="ph-duotone ph-caret-right" style={{ fontSize: 16, color: "#78716C" }} />
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {timeline.map((e, i) =>
          e.isNow ? (
            <div key={`now-${i}`} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#D63A2F", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{clock}</span>
              <div style={{ position: "relative", height: 2, background: "#D63A2F", borderRadius: 1 }}>
                <div style={{ position: "absolute", left: -5, top: -4, width: 10, height: 10, borderRadius: "50%", background: "#D63A2F" }} />
              </div>
            </div>
          ) : e.kind === "meal" ? (
            <div key={`meal-${e.meal.key}`} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", gap: 8, padding: "4px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#57534E", textAlign: "right", paddingTop: 16, fontVariantNumeric: "tabular-nums" }}>{e.time}</span>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <MealCard
                  meal={e.meal}
                  picks={todayPicks}
                  isOpen={expandedMeal === e.meal.key}
                  onToggleOpen={() => setExpandedMeal((k) => (k === e.meal.key ? null : e.meal.key))}
                  onChange={onPersistPicks}
                />
              </div>
            </div>
          ) : (
            <div key={`${e.title}-${e.time}`} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", gap: 8, padding: "4px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#57534E", textAlign: "right", paddingTop: 16, fontVariantNumeric: "tabular-nums" }}>{e.time}</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 20,
                  background: `rgba(255,255,255,${e.done ? ".22" : toMin(e.time) < nowMin ? ".4" : ".55"})`,
                  backdropFilter: "blur(14px) saturate(1.8)",
                  WebkitBackdropFilter: "blur(14px) saturate(1.8)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.85), 0 0 0 .5px rgba(255,255,255,.45), 0 8px 20px -14px rgba(80,45,20,.4)",
                }}
              >
                <button onClick={e.onOpen} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, border: 0, padding: 0, background: "transparent", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, display: "grid", placeItems: "center", background: e.bg, color: e.fg, fontSize: 17, boxShadow: "0 1px 2px rgba(28,28,30,.2)" }}>
                    <i className={`ph-fill ${e.icon}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: e.done ? "#57534E" : "#1C1C1E", textDecoration: e.done ? "line-through" : "none" }}>{e.title}</span>
                    <span style={{ fontSize: 13, color: "#57534E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.sub}</span>
                  </div>
                </button>
                {e.checkable && (
                  <button onClick={e.onToggle} aria-label="Marcar" style={{ width: 44, height: 44, margin: "-8px -8px -8px 0", flexShrink: 0, display: "grid", placeItems: "center", border: 0, background: "transparent", cursor: "pointer" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", background: e.done ? "#C97B4A" : "transparent", boxShadow: e.done ? "none" : "inset 0 0 0 1.5px rgba(28,28,30,.28)", color: "#fff", fontSize: 15 }}>
                      {e.done && <i className="ph-fill ph-check" />}
                    </span>
                  </button>
                )}
                {e.cta && (
                  <button onClick={e.onOpen} style={{ flexShrink: 0, minHeight: 34, padding: "0 16px", border: 0, borderRadius: 999, background: "#1C1C1E", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    {e.cta}
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <button
        onClick={() => onOpenApp("insights")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          border: 0,
          borderRadius: 24,
          background: "rgba(28,28,30,.55)",
          backdropFilter: "blur(14px) saturate(1.6)",
          WebkitBackdropFilter: "blur(14px) saturate(1.6)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 0 0 .5px rgba(255,255,255,.15), 0 12px 30px -14px rgba(28,28,30,.5)",
          color: "#fff",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, display: "grid", placeItems: "center", background: "linear-gradient(160deg,#E2C07E,#B8914A)", color: "#1C1C1E", fontSize: 20 }}>
          <i className="ph-fill ph-chart-bar" />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#E2C07E" }}>Insights</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{streakLine}</span>
        </div>
        <i className="ph-duotone ph-caret-right" style={{ fontSize: 16, color: "rgba(255,255,255,.6)" }} />
      </button>
    </div>
  );
}
