"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addDietMeasurement,
  clearDietShoppingState,
  getDietDayLogs,
  getDietMeasurements,
  getDietPlan,
  getDietShoppingState,
  getTodayDietLog,
  saveTodayDietLog,
  setDietShoppingItem,
} from "@/lib/dietData";
import {
  dayTotals,
  emptyDietDay,
  formatDietDate,
  getDietStreak,
  type DietDayLog,
  type DietDayPicks,
  type DietMeasurement,
  type DietPlan,
} from "@/lib/diet";
import { C, DISPLAY, styles } from "@/lib/styles";
import { disableMealReminders, enableMealReminders, isNativePlatform } from "@/lib/notifications";
import { guardOffline, loadWithCache, useOnline } from "@/lib/offline";
import { useEdgeSwipeBack } from "@/lib/gestures";
import { MealCard } from "./dietShared";
import { SupplementIcon } from "./Icons";

type Tab = "hoje" | "progresso" | "compras" | "mais";

interface DietBundle {
  p: DietPlan | null;
  today: { picks: DietDayPicks; supplements: Record<string, boolean> };
  h: DietDayLog[];
  m: DietMeasurement[];
  shop: Record<string, boolean>;
}

export default function DietApp({
  onExit, initialTab, initialOpenMealKey,
}: {
  onExit: () => void;
  initialTab?: Tab;
  initialOpenMealKey?: string;
}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [picks, setPicks] = useState<DietDayPicks>(emptyDietDay());
  const [supplementsToday, setSupplementsToday] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<DietDayLog[]>([]);
  const [measurements, setMeasurements] = useState<DietMeasurement[]>([]);
  const [shoppingState, setShoppingState] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>(initialTab ?? "hoje");
  const [openMeal, setOpenMeal] = useState<string | null>(initialOpenMealKey ?? null);
  const [measureForm, setMeasureForm] = useState({ weight: "", waist: "", hip: "", arm: "", thigh: "" });
  const [remindersOn, setRemindersOn] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const online = useOnline();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, offline } = await loadWithCache<DietBundle>("diet", async () => {
        const [p, today, h, m, shop] = await Promise.all([
          getDietPlan(supabase),
          getTodayDietLog(supabase),
          getDietDayLogs(supabase),
          getDietMeasurements(supabase),
          getDietShoppingState(supabase),
        ]);
        return { p, today, h, m, shop };
      }, online);
      if (cancelled) return;
      setPlan(data.p);
      setPicks(data.today.picks);
      setSupplementsToday(data.today.supplements);
      setHistory(data.h);
      setMeasurements(data.m);
      setShoppingState(data.shop);
      setUsingCache(offline);
      setRemindersOn(localStorage.getItem("diet-reminders-on") === "1");
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextPicks: DietDayPicks, nextSupplements: Record<string, boolean>) {
    if (guardOffline(online)) return;
    setPicks(nextPicks);
    setSupplementsToday(nextSupplements);
    saveTodayDietLog(supabase, nextPicks, nextSupplements).catch((err) => console.error("Falha ao salvar dieta:", err));
  }

  const totals = useMemo(() => (plan ? dayTotals(plan, picks) : { kcal: 0, p: 0, c: 0, g: 0 }), [plan, picks]);
  const streak = useMemo(() => (plan ? getDietStreak(plan, picks, history) : 0), [plan, picks, history]);
  const backSwipeRef = useEdgeSwipeBack(onExit);

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  if (!plan) {
    return (
      <div style={styles.container} ref={backSwipeRef}>
        <div style={styles.dietHeader}>
          <div style={{ ...styles.dietSectionCard, margin: "20px 0 0" }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16 }}>Ainda sem plano cadastrado</div>
            <div style={{ fontSize: 13, color: C.midGray, marginTop: 6, lineHeight: 1.5 }}>Nenhum plano alimentar foi importado ainda.</div>
          </div>
        </div>
      </div>
    );
  }

  const kcalPct = Math.min(100, Math.round((totals.kcal / plan.kcalTarget) * 100));
  const overLimit = totals.kcal > plan.kcalTarget;

  function toggleMeal(key: string) {
    setOpenMeal((cur) => (cur === key ? null : key));
  }

  function toggleSupplement(key: string) {
    persist(picks, { ...supplementsToday, [key]: !supplementsToday[key] });
  }

  async function toggleReminders() {
    const next = !remindersOn;
    if (next) {
      const granted = await enableMealReminders();
      setRemindersOn(granted);
      localStorage.setItem("diet-reminders-on", granted ? "1" : "0");
    } else {
      await disableMealReminders();
      setRemindersOn(false);
      localStorage.setItem("diet-reminders-on", "0");
    }
  }

  const suppDone = plan.supplements.filter((s) => supplementsToday[s.key]).length;

  return (
    <div style={styles.container} ref={backSwipeRef}>
        <div style={styles.dietHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={styles.dietStreakPill}>🔥 {streak} {streak === 1 ? "dia" : "dias"}</div>
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, marginTop: 14 }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: C.midGray, marginTop: 3 }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>

        {(!online || usingCache) && (
          <div style={styles.offlineBanner}>📡 Sem conexão — modo de visualização, mudanças não serão salvas agora.</div>
        )}

        <div style={styles.segRow}>
          {([
            { key: "hoje", label: "Hoje" },
            { key: "progresso", label: "Progresso" },
            { key: "compras", label: "Compras" },
            { key: "mais", label: "Mais" },
          ] as { key: Tab; label: string }[]).map((n) => (
            <button key={n.key} style={{ ...styles.segBtn, ...(tab === n.key ? styles.segBtnActive : {}) }} onClick={() => setTab(n.key)}>
              {n.label}
            </button>
          ))}
        </div>

        {tab === "hoje" && (
          <>
            <div style={styles.dietKcalCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ ...styles.dietRingOuter, background: `conic-gradient(${C.honey} ${kcalPct}%, rgba(13,27,42,.08) 0)` }}>
                  <div style={styles.dietRingInner}>
                    <div style={styles.dietRingKcal}>{totals.kcal}</div>
                    <div style={styles.dietRingTarget}>de {plan.kcalTarget} kcal</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { label: "Proteína", value: totals.p, target: plan.proteinTarget, color: C.honey },
                    { label: "Carbo", value: totals.c, target: plan.carbTarget, color: C.steel },
                    { label: "Gordura", value: totals.g, target: plan.fatTarget, color: C.accent },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ ...styles.dietMacroRow, color: m.color }}>
                        <span>{m.label}</span>
                        <span>{m.value}g / {m.target}g</span>
                      </div>
                      <div style={styles.dietMacroTrack}>
                        <div style={{ ...styles.dietMacroFill, background: m.color, width: `${Math.min(100, Math.round((m.value / m.target) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {overLimit && <div style={styles.dietWarningBanner}>Você passou da meta de {plan.kcalTarget} kcal hoje.</div>}
            </div>

            <div style={styles.dietMealList}>
              {plan.meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  picks={picks}
                  isOpen={openMeal === meal.key}
                  onToggleOpen={() => toggleMeal(meal.key)}
                  onChange={(next) => persist(next, supplementsToday)}
                />
              ))}

              <div style={styles.dietSuppMini} onClick={() => setTab("mais")}>
                <div style={styles.dietSuppIcon}><SupplementIcon size={16} color={C.honeyText} markColor={C.honeySoft} /></div>
                <div style={{ flex: 1 }}>
                  <div style={styles.dietMealName}>Suplementos de hoje</div>
                  <div style={styles.dietMealSummary}>{suppDone} de {plan.supplements.length} feitos</div>
                </div>
                <div style={{ color: C.midGray, fontSize: 18, fontWeight: 700 }}>›</div>
              </div>
            </div>
          </>
        )}

        {tab === "progresso" && (
          <ProgressTab plan={plan} history={history} picks={picks} measurements={measurements} measureForm={measureForm} setMeasureForm={setMeasureForm}
            onSave={async () => {
              if (guardOffline(online)) return;
              if (!measureForm.weight) return;
              const entry = await addDietMeasurement(supabase, {
                weight: parseFloat(measureForm.weight) || null,
                waist: measureForm.waist ? parseFloat(measureForm.waist) : null,
                hip: measureForm.hip ? parseFloat(measureForm.hip) : null,
                arm: measureForm.arm ? parseFloat(measureForm.arm) : null,
                thigh: measureForm.thigh ? parseFloat(measureForm.thigh) : null,
              });
              setMeasurements((prev) => [entry, ...prev]);
              setMeasureForm({ weight: "", waist: "", hip: "", arm: "", thigh: "" });
            }}
          />
        )}

        {tab === "compras" && (
          <ShoppingTab
            plan={plan}
            shoppingState={shoppingState}
            onToggle={(itemKey) => {
              if (guardOffline(online)) return;
              const next = !shoppingState[itemKey];
              setShoppingState((prev) => ({ ...prev, [itemKey]: next }));
              setDietShoppingItem(supabase, itemKey, next).catch((err) => console.error("Falha ao salvar compras:", err));
            }}
            onReset={() => {
              if (guardOffline(online)) return;
              setShoppingState({});
              clearDietShoppingState(supabase).catch((err) => console.error("Falha ao limpar compras:", err));
            }}
          />
        )}

        {tab === "mais" && (
          <MaisTab plan={plan} supplementsToday={supplementsToday} onToggleSupplement={toggleSupplement} remindersOn={remindersOn} onToggleReminders={toggleReminders} />
        )}
    </div>
  );
}

function ProgressTab({
  plan, history, picks, measurements, measureForm, setMeasureForm, onSave,
}: {
  plan: DietPlan;
  history: DietDayLog[];
  picks: DietDayPicks;
  measurements: DietMeasurement[];
  measureForm: { weight: string; waist: string; hip: string; arm: string; thigh: string };
  setMeasureForm: React.Dispatch<React.SetStateAction<{ weight: string; waist: string; hip: string; arm: string; thigh: string }>>;
  onSave: () => void;
}) {
  const today = formatDietDate(new Date());
  const byDate = new Map(history.map((h) => [h.date, h]));
  const days: { label: string; kcal: number; over: boolean }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const key = formatDietDate(cursor);
    const dayPicks = key === today ? picks : byDate.get(key)?.picks ?? emptyDietDay();
    const t = dayTotals(plan, dayPicks);
    days.push({ label: cursor.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3), kcal: t.kcal, over: t.kcal > plan.kcalTarget });
    cursor.setDate(cursor.getDate() + 1);
  }
  const avgKcal = Math.round(days.reduce((a, d) => a + d.kcal, 0) / 7);
  const maxKcal = Math.max(plan.kcalTarget, ...days.map((d) => d.kcal), 1);

  const adherence = (target: number, key: "p" | "c" | "g") => {
    const vals = [...history.filter((h) => h.date >= formatDietDate(cursor)).map((h) => dayTotals(plan, h.picks)[key]), dayTotals(plan, picks)[key]];
    const avg = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
    return Math.min(100, Math.round((avg / target) * 100));
  };

  const fields: { key: keyof typeof measureForm; label: string }[] = [
    { key: "weight", label: "Peso (kg)" }, { key: "waist", label: "Cintura (cm)" }, { key: "hip", label: "Quadril (cm)" },
    { key: "arm", label: "Braço (cm)" }, { key: "thigh", label: "Coxa (cm)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
      <div style={styles.dietSectionCard}>
        <div style={styles.dietSectionTitle}>Insights da semana</div>
        <div style={styles.dietWeekBars}>
          {days.map((d, i) => (
            <div key={i} style={styles.dietWeekBarCol}>
              <div style={{ ...styles.dietWeekBar, height: `${Math.max(4, Math.round((d.kcal / maxKcal) * 100))}%`, background: d.over ? C.red : C.accent }} />
              <div style={styles.dietWeekBarLabel}>{d.label}</div>
            </div>
          ))}
        </div>
        <div style={styles.dietInsightText}>
          Média de {avgKcal} kcal/dia nos últimos 7 dias · meta {plan.kcalTarget} kcal.<br />
          Adesão aos macros: P {adherence(plan.proteinTarget, "p")}% · C {adherence(plan.carbTarget, "c")}% · G {adherence(plan.fatTarget, "g")}%.
        </div>
      </div>

      <div style={styles.dietSectionCard}>
        <div style={styles.dietSectionTitle}>Peso e medidas</div>
        <div style={styles.dietMeasureGrid}>
          {fields.map((f) => (
            <div key={f.key} style={styles.dietMeasureField}>
              <div style={styles.dietMeasureLabel}>{f.label}</div>
              <input
                style={styles.dietMeasureInput}
                inputMode="decimal"
                value={measureForm[f.key]}
                onChange={(e) => setMeasureForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <button style={styles.confirmBtn} onClick={onSave}>Salvar registro de hoje</button>
        {measurements.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionLabel}>HISTÓRICO ({measurements.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {measurements.slice(0, 10).map((m) => (
                <div key={m.id} style={styles.dietMeasureHistRow}>
                  <span style={{ fontSize: 12, color: C.midGray, fontWeight: 600 }}>{new Date(m.date).toLocaleDateString("pt-BR")}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.weight} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingTab({
  plan, shoppingState, onToggle, onReset,
}: {
  plan: DietPlan;
  shoppingState: Record<string, boolean>;
  onToggle: (itemKey: string) => void;
  onReset: () => void;
}) {
  const total = plan.shoppingCategories.reduce((a, c) => a + c.items.length, 0);
  const checked = plan.shoppingCategories.reduce((a, c) => a + c.items.filter((it) => shoppingState[`${c.name}|${it}`]).length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
      <div style={styles.dietShopHeader}>
        <span style={styles.dietShopCount}>{checked} de {total} marcados</span>
        <button style={styles.dietShopReset} onClick={onReset}>Reiniciar</button>
      </div>
      {plan.shoppingCategories.map((cat) => (
        <div key={cat.id} style={styles.dietSectionCard}>
          <div style={{ ...styles.dietSectionTitle, fontSize: 14, marginBottom: 10 }}>{cat.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {cat.items.map((it) => {
              const key = `${cat.name}|${it}`;
              const on = !!shoppingState[key];
              return (
                <div key={it} style={styles.dietShopRow} onClick={() => onToggle(key)}>
                  <div style={{ ...styles.dietShopCheck, ...(on ? styles.dietShopCheckOn : {}) }}>{on ? "✓" : ""}</div>
                  <div style={{ ...styles.dietShopLabel, ...(on ? styles.dietShopLabelOn : {}) }}>{it}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MaisTab({
  plan, supplementsToday, onToggleSupplement, remindersOn, onToggleReminders,
}: {
  plan: DietPlan;
  supplementsToday: Record<string, boolean>;
  onToggleSupplement: (key: string) => void;
  remindersOn: boolean;
  onToggleReminders: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
      <div style={styles.dietSectionCard}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16 }}>{plan.nutriName ?? "Nutricionista"}</div>
        {plan.nutriCrn && <div style={{ fontSize: 12.5, color: C.midGray, marginTop: 2 }}>{plan.nutriCrn}</div>}
        <div style={styles.dietStatCols}>
          <div><div style={styles.dietStatColLabel}>OBJETIVO</div><div style={styles.dietStatColValue}>{plan.objective}</div></div>
          <div><div style={styles.dietStatColLabel}>ÁGUA</div><div style={styles.dietStatColValue}>{plan.waterGoal}</div></div>
          <div><div style={styles.dietStatColLabel}>PRÓXIMA CONSULTA</div><div style={styles.dietStatColValue}>{plan.nextConsult}</div></div>
        </div>
      </div>

      <div style={styles.dietSectionCard}>
        <div style={styles.dietSectionTitle}>Suplementos de hoje</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.supplements.map((s) => {
            const on = !!supplementsToday[s.key];
            return (
              <div key={s.id} style={styles.dietShopRow} onClick={() => onToggleSupplement(s.key)}>
                <div style={{ ...styles.dietShopCheck, ...(on ? styles.dietShopCheckOn : {}) }}>{on ? "✓" : ""}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.dietShopLabel}>{s.label}</div>
                  <div style={{ fontSize: 11, color: C.midGray, marginTop: 1 }}>{s.timing}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {plan.supplementGroups.map((g) => (
        <div key={g.id} style={styles.dietSectionCard}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14.5 }}>{g.title}</div>
          {g.note && <div style={{ fontSize: 11, color: C.midGray, margin: "3px 0 8px" }}>{g.note}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: g.note ? 0 : 8 }}>
            {g.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ fontWeight: 600 }}>{it.name}</span>
                <span style={{ color: C.midGray, fontWeight: 700 }}>{it.dose}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={styles.dietSectionCard}>
        <div style={{ ...styles.dietSectionTitle, fontSize: 14.5 }}>Regras gerais do plano</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.generalRules.map((r, i) => (
            <div key={i} style={styles.dietBulletRow}>
              <div style={styles.dietBulletDot} />
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{r}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.dietSectionCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14.5 }}>Lembretes de refeição</div>
          <button
            style={{ ...styles.dietPortionBtn, width: "auto", padding: "6px 14px", ...(remindersOn ? styles.dietPortionBtnActive : {}) }}
            onClick={onToggleReminders}
          >
            {remindersOn ? "Ativado" : "Desativado"}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 8, lineHeight: 1.5 }}>
          {isNativePlatform()
            ? "Notifica no horário de cada refeição, mesmo com o app fechado."
            : "Disponível apenas no app nativo (iOS) — no navegador as notificações não persistem com o app fechado."}
        </div>
      </div>

      {plan.recipe && (
        <div style={styles.dietSectionCard}>
          <div style={{ ...styles.dietSectionTitle, fontSize: 14.5 }}>{plan.recipe.title}</div>
          <div style={styles.sectionLabel}>INGREDIENTES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {plan.recipe.ingredients.map((it, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>• {it}</div>)}
          </div>
          <div style={styles.sectionLabel}>MODO DE PREPARO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {plan.recipe.steps.map((st, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>{st}</div>)}
          </div>
        </div>
      )}

      {plan.fruitEquivalents.length > 0 && (
        <div style={styles.dietSectionCard}>
          <div style={{ ...styles.dietSectionTitle, fontSize: 14.5 }}>Equivalentes de fruta (70–80 kcal)</div>
          <div style={styles.dietFruitGrid}>
            {plan.fruitEquivalents.map((fe, i) => (
              <div key={i}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{fe.name}</div>
                <div style={{ fontSize: 11.5, color: C.midGray }}>{fe.amount}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
