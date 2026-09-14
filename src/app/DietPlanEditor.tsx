"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDietShoppingCategory,
  addDietSupplement,
  addDietSupplementGroup,
  createDietPlan,
  deleteDietPlan,
  deleteDietShoppingCategory,
  deleteDietSupplement,
  deleteDietSupplementGroup,
  scheduleDietPlan,
  updateDietMeal,
  updateDietPlanFields,
  type DietPlanFieldsInput,
} from "@/lib/dietData";
import type { DietMeal, DietMealOption, DietMealRadioGroup, DietPlan, DietShoppingCategory, DietSupplement, DietSupplementGroup } from "@/lib/diet";
import { C, DISPLAY, SCREEN_ANIM, styles } from "@/lib/styles";
import { addBtnStyle, cancelBtn, confirmSmallBtn, inputStyle, labelStyle, smallDangerBtn, NewDietPlanForm } from "./dietPlanShared";
import { SectionHeader } from "./programShared";

const MEAL_ORDER = ["cafe", "almoco", "lanche", "jantar", "sobremesa"];
const MEAL_EMOJI: Record<string, string> = { cafe: "☕", almoco: "🍛", lanche: "🥪", jantar: "🍽️", sobremesa: "🍰" };

function zeroMacro() {
  return { kcal: 0, p: 0, c: 0, g: 0 };
}

export default function DietPlanEditor({
  supabase,
  plan,
  target,
  planSeq,
  onBack,
  onChanged,
  startWithCreateForm = false,
}: {
  supabase: SupabaseClient;
  plan: DietPlan | null;
  target: "active" | "scheduled";
  planSeq: Map<string, number>;
  onBack: () => void;
  onChanged: () => Promise<void>;
  startWithCreateForm?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(startWithCreateForm);
  const isScheduled = target === "scheduled";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!plan || showReplaceForm) {
    return (
      <div style={{ animation: SCREEN_ANIM }}>
        <div style={styles.topNav}>
          <button onClick={plan ? () => setShowReplaceForm(false) : onBack} style={styles.backBtn}>← Voltar</button>
        </div>
        <div style={{ ...styles.histBody, paddingBottom: 40 }}>
          <h2 style={styles.histTitle}>{isScheduled ? "Agendar plano" : "Plano alimentar"}</h2>
          <NewDietPlanForm
            busy={busy}
            hasExisting={!!plan}
            scheduling={isScheduled}
            onCancel={() => setShowReplaceForm(false)}
            onCreate={(input) =>
              run(async () => {
                if (isScheduled) await scheduleDietPlan(supabase, input);
                else await createDietPlan(supabase, input);
                setShowReplaceForm(false);
              })
            }
          />
        </div>
      </div>
    );
  }

  const seq = planSeq.get(plan.id) ?? 0;

  return (
    <div style={{ animation: SCREEN_ANIM }}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backBtn}>← Plano</button>
      </div>
      <div style={{ ...styles.histBody, paddingBottom: 60, display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: isScheduled ? C.midGray : C.accent }}>
            {isScheduled ? "AGENDADO" : "ATIVO"}
          </div>
          <h2 style={{ ...styles.histTitle, marginTop: 4 }}>{`PA${seq} · ${plan.name}`}</h2>
          {plan.endDate && <div style={{ fontSize: 12, color: C.midGray, marginTop: 2 }}>Válido até {plan.endDate}</div>}
        </div>

        <PlanFieldsCard supabase={supabase} plan={plan} busy={busy} run={run} />

        <div>
          <SectionHeader title="Refeições" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...plan.meals]
              .sort((a, b) => MEAL_ORDER.indexOf(a.key) - MEAL_ORDER.indexOf(b.key))
              .map((meal) => (
                <MealEditorCard key={meal.id} supabase={supabase} meal={meal} busy={busy} run={run} />
              ))}
          </div>
        </div>

        <SupplementsSection supabase={supabase} plan={plan} busy={busy} run={run} />
        <SupplementGroupsSection supabase={supabase} plan={plan} busy={busy} run={run} />
        <ShoppingSection supabase={supabase} plan={plan} busy={busy} run={run} />

        <div style={{ marginTop: 10 }}>
          {isScheduled ? (
            <button
              disabled={busy}
              onClick={() => run(async () => deleteDietPlan(supabase, plan.id))}
              style={{ ...cancelBtn, width: "100%", color: C.red, borderColor: "rgba(255,95,82,.35)" }}
            >
              Remover plano agendado
            </button>
          ) : (
            <button disabled={busy} onClick={() => setShowReplaceForm(true)} style={{ ...cancelBtn, width: "100%" }}>
              Encerrar este plano e criar um novo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanFieldsCard({
  supabase,
  plan,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  plan: DietPlan;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [kcal, setKcal] = useState(String(plan.kcalTarget));
  const [protein, setProtein] = useState(String(plan.proteinTarget));
  const [carb, setCarb] = useState(String(plan.carbTarget));
  const [fat, setFat] = useState(String(plan.fatTarget));
  const [nutriName, setNutriName] = useState(plan.nutriName ?? "");
  const [nutriCrn, setNutriCrn] = useState(plan.nutriCrn ?? "");
  const [objective, setObjective] = useState(plan.objective ?? "");
  const [waterGoal, setWaterGoal] = useState(plan.waterGoal ?? "");
  const [nextConsult, setNextConsult] = useState(plan.nextConsult ?? "");
  const [endDate, setEndDate] = useState(plan.endDate ?? "");
  const [generalRules, setGeneralRules] = useState(plan.generalRules.join("\n"));
  const [fruitEquivalents, setFruitEquivalents] = useState(
    plan.fruitEquivalents.map((f) => `${f.name}: ${f.amount}`).join("\n")
  );

  function buildInput(): DietPlanFieldsInput {
    return {
      name: name.trim(),
      kcalTarget: Number(kcal),
      proteinTarget: Number(protein),
      carbTarget: Number(carb),
      fatTarget: Number(fat),
      nutriName: nutriName.trim() || null,
      nutriCrn: nutriCrn.trim() || null,
      objective: objective.trim() || null,
      waterGoal: waterGoal.trim() || null,
      nextConsult: nextConsult.trim() || null,
      endDate: endDate || null,
      generalRules: generalRules.split("\n").map((s) => s.trim()).filter(Boolean),
      fruitEquivalents: fruitEquivalents
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [n, ...rest] = line.split(":");
          return { name: n.trim(), amount: rest.join(":").trim() };
        }),
      recipe: plan.recipe,
    };
  }

  if (!editing) {
    return (
      <div style={{ ...styles.dietSectionCard, margin: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: 13, color: C.lightGray, lineHeight: 1.7 }}>
            <div>{plan.kcalTarget} kcal · P{plan.proteinTarget}g · C{plan.carbTarget}g · G{plan.fatTarget}g</div>
            {plan.objective && <div>Objetivo: {plan.objective}</div>}
            {plan.nutriName && <div>Nutri: {plan.nutriName}{plan.nutriCrn ? ` (${plan.nutriCrn})` : ""}</div>}
            {plan.waterGoal && <div>Água: {plan.waterGoal}</div>}
            {plan.nextConsult && <div>Próxima consulta: {plan.nextConsult}</div>}
          </div>
          <button onClick={() => setEditing(true)} style={{ ...smallDangerBtn, color: C.accent }}>Editar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={labelStyle}>Nome
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={labelStyle}>Kcal<input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Proteína (g)<input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Carbo (g)<input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Gordura (g)<input type="number" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} /></label>
      </div>
      <label style={labelStyle}>Objetivo<input value={objective} onChange={(e) => setObjective(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>Nutricionista<input value={nutriName} onChange={(e) => setNutriName(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>CRN<input value={nutriCrn} onChange={(e) => setNutriCrn(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>Meta de água<input value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>Próxima consulta<input value={nextConsult} onChange={(e) => setNextConsult(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>Válido até<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>Regras gerais (uma por linha)
        <textarea value={generalRules} onChange={(e) => setGeneralRules(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <label style={labelStyle}>Equivalentes de fruta (uma por linha: &quot;Nome: quantidade&quot;)
        <textarea value={fruitEquivalents} onChange={(e) => setFruitEquivalents(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setEditing(false)} style={cancelBtn}>Cancelar</button>
        <button
          disabled={busy || !name.trim() || !kcal || !protein || !carb || !fat}
          onClick={() =>
            run(async () => {
              await updateDietPlanFields(supabase, plan.id, buildInput());
              setEditing(false);
            })
          }
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function MealEditorCard({
  supabase,
  meal,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  meal: DietMeal;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(meal.label);
  const [allowPortion, setAllowPortion] = useState(meal.allowPortion);
  const [hasNoneOption, setHasNoneOption] = useState(meal.hasNoneOption);
  const [options, setOptions] = useState<DietMealOption[]>(meal.options ?? []);
  const [radioGroups, setRadioGroups] = useState<DietMealRadioGroup[]>(meal.groups?.radioGroups ?? []);
  const [toggleLabel, setToggleLabel] = useState(meal.groups?.toggle.label ?? "Fruta");
  const [toggleMacro, setToggleMacro] = useState(meal.groups?.toggle ?? { key: "fruta", label: "Fruta", ...zeroMacro() });

  function save() {
    run(async () => {
      await updateDietMeal(supabase, meal.id, {
        key: meal.key,
        label: label.trim(),
        kind: meal.kind,
        allowPortion,
        hasNoneOption,
        options: meal.kind === "list" ? options : null,
        groups: meal.kind === "builder" ? { radioGroups, toggle: { ...toggleMacro, key: "fruta", label: toggleLabel } } : null,
        orderIndex: meal.orderIndex,
      });
      setEditing(false);
    });
  }

  if (!editing) {
    const count = meal.kind === "list" ? (meal.options?.length ?? 0) : (meal.groups?.radioGroups.length ?? 0);
    return (
      <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14 }}>{MEAL_EMOJI[meal.key] ?? "🍽️"} {meal.label}</div>
          <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 2 }}>
            {meal.kind === "list" ? `${count} ${count === 1 ? "opção" : "opções"}` : `${count} ${count === 1 ? "grupo" : "grupos"}`}
          </div>
        </div>
        <button onClick={() => setEditing(true)} style={{ ...smallDangerBtn, color: C.accent }}>Editar</button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={labelStyle}>Nome da refeição
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.lightGray }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={allowPortion} onChange={(e) => setAllowPortion(e.target.checked)} /> Permite porção
        </label>
        {meal.kind === "list" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={hasNoneOption} onChange={(e) => setHasNoneOption(e.target.checked)} /> Tem opção &quot;nenhuma&quot;
          </label>
        )}
      </div>

      {meal.kind === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ background: C.bgPage, border: `1px solid ${C.bgHeader}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="Nome da opção"
                  value={opt.label}
                  onChange={(e) => setOptions(options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => setOptions(options.filter((_, j) => j !== i))} style={smallDangerBtn}>Remover</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {(["kcal", "p", "c", "g"] as const).map((f) => (
                  <input
                    key={f}
                    type="number"
                    placeholder={f}
                    value={opt[f]}
                    onChange={(e) => setOptions(options.map((o, j) => (j === i ? { ...o, [f]: Number(e.target.value) } : o)))}
                    style={inputStyle}
                  />
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setOptions([...options, { label: "", ...zeroMacro() }])} style={addBtnStyle}>+ Adicionar opção</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {radioGroups.map((grp, i) => (
              <div key={i} style={{ background: C.bgPage, border: `1px solid ${C.bgHeader}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    placeholder="Título do grupo (ex.: Carboidrato)"
                    value={grp.title}
                    onChange={(e) =>
                      setRadioGroups(radioGroups.map((g, j) => (j === i ? { ...g, title: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") } : g)))
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => setRadioGroups(radioGroups.filter((_, j) => j !== i))} style={smallDangerBtn}>Remover</button>
                </div>
                <input
                  placeholder="Itens separados por vírgula"
                  value={grp.items.join(", ")}
                  onChange={(e) =>
                    setRadioGroups(radioGroups.map((g, j) => (j === i ? { ...g, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : g)))
                  }
                  style={inputStyle}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {(["kcal", "p", "c", "g"] as const).map((f) => (
                    <input
                      key={f}
                      type="number"
                      placeholder={f}
                      value={grp[f]}
                      onChange={(e) => setRadioGroups(radioGroups.map((g, j) => (j === i ? { ...g, [f]: Number(e.target.value) } : g)))}
                      style={inputStyle}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setRadioGroups([...radioGroups, { key: "", title: "", items: [], ...zeroMacro() }])}
              style={addBtnStyle}
            >
              + Adicionar grupo
            </button>
          </div>

          <div style={{ background: C.bgPage, border: `1px solid ${C.bgHeader}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.midGray }}>OPÇÃO EXTRA (ex.: fruta)</div>
            <input placeholder="Nome" value={toggleLabel} onChange={(e) => setToggleLabel(e.target.value)} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {(["kcal", "p", "c", "g"] as const).map((f) => (
                <input
                  key={f}
                  type="number"
                  placeholder={f}
                  value={toggleMacro[f]}
                  onChange={(e) => setToggleMacro({ ...toggleMacro, [f]: Number(e.target.value) })}
                  style={inputStyle}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setEditing(false)} style={cancelBtn}>Cancelar</button>
        <button disabled={busy || !label.trim()} onClick={save} style={{ ...confirmSmallBtn, flex: 1 }}>Salvar</button>
      </div>
    </div>
  );
}

function SupplementsSection({
  supabase,
  plan,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  plan: DietPlan;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [timing, setTiming] = useState("");

  function slug(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  return (
    <div>
      <SectionHeader title="Suplementos" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.supplements.map((s: DietSupplement) => (
          <div key={s.id} style={{ ...styles.dietSectionCard, margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
              {s.timing && <div style={{ fontSize: 11.5, color: C.midGray }}>{s.timing}</div>}
            </div>
            <button
              disabled={busy}
              onClick={() => run(async () => deleteDietSupplement(supabase, s.id))}
              style={smallDangerBtn}
            >
              Remover
            </button>
          </div>
        ))}
        {adding ? (
          <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Nome" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
            <input placeholder="Horário (opcional)" value={timing} onChange={(e) => setTiming(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdding(false)} style={cancelBtn}>Cancelar</button>
              <button
                disabled={busy || !label.trim()}
                onClick={() =>
                  run(async () => {
                    await addDietSupplement(supabase, plan.id, { key: slug(label), label: label.trim(), timing: timing.trim() || null, orderIndex: plan.supplements.length });
                    setLabel("");
                    setTiming("");
                    setAdding(false);
                  })
                }
                style={{ ...confirmSmallBtn, flex: 1 }}
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={addBtnStyle}>+ Adicionar suplemento</button>
        )}
      </div>
    </div>
  );
}

function SupplementGroupsSection({
  supabase,
  plan,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  plan: DietPlan;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState("");

  function parseItems(raw: string): { name: string; dose: string }[] {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [n, ...rest] = line.split("-");
        return { name: n.trim(), dose: rest.join("-").trim() };
      });
  }

  return (
    <div>
      <SectionHeader title="Grupos de suplementos" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.supplementGroups.map((g: DietSupplementGroup) => (
          <div key={g.id} style={{ ...styles.dietSectionCard, margin: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
              {g.note && <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 2 }}>{g.note}</div>}
              <div style={{ fontSize: 11.5, color: C.lightGray, marginTop: 4 }}>{g.items.map((it) => `${it.name} — ${it.dose}`).join(" · ")}</div>
            </div>
            <button disabled={busy} onClick={() => run(async () => deleteDietSupplementGroup(supabase, g.id))} style={smallDangerBtn}>Remover</button>
          </div>
        ))}
        {adding ? (
          <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            <input placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
            <textarea placeholder={"Um item por linha: Nome - dose"} value={items} onChange={(e) => setItems(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdding(false)} style={cancelBtn}>Cancelar</button>
              <button
                disabled={busy || !title.trim()}
                onClick={() =>
                  run(async () => {
                    await addDietSupplementGroup(supabase, plan.id, {
                      title: title.trim(),
                      note: note.trim() || null,
                      items: parseItems(items),
                      orderIndex: plan.supplementGroups.length,
                    });
                    setTitle("");
                    setNote("");
                    setItems("");
                    setAdding(false);
                  })
                }
                style={{ ...confirmSmallBtn, flex: 1 }}
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={addBtnStyle}>+ Adicionar grupo</button>
        )}
      </div>
    </div>
  );
}

function ShoppingSection({
  supabase,
  plan,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  plan: DietPlan;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState("");

  return (
    <div>
      <SectionHeader title="Lista de compras" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.shoppingCategories.map((cat: DietShoppingCategory) => (
          <div key={cat.id} style={{ ...styles.dietSectionCard, margin: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</div>
              <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 2 }}>{cat.items.join(", ")}</div>
            </div>
            <button disabled={busy} onClick={() => run(async () => deleteDietShoppingCategory(supabase, cat.id))} style={smallDangerBtn}>Remover</button>
          </div>
        ))}
        {adding ? (
          <div style={{ ...styles.dietSectionCard, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Categoria (ex.: Hortifruti)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <textarea placeholder={"Um item por linha"} value={items} onChange={(e) => setItems(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdding(false)} style={cancelBtn}>Cancelar</button>
              <button
                disabled={busy || !name.trim()}
                onClick={() =>
                  run(async () => {
                    await addDietShoppingCategory(supabase, plan.id, {
                      name: name.trim(),
                      items: items.split("\n").map((s) => s.trim()).filter(Boolean),
                      orderIndex: plan.shoppingCategories.length,
                    });
                    setName("");
                    setItems("");
                    setAdding(false);
                  })
                }
                style={{ ...confirmSmallBtn, flex: 1 }}
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={addBtnStyle}>+ Adicionar categoria</button>
        )}
      </div>
    </div>
  );
}
