"use client";

import { useState } from "react";
import { isMealCustom, isMealDone, isMealSkipped, type AlmocoPicks, type DietDayPicks, type DietMeal, type MacroValues } from "@/lib/diet";
import { C, styles } from "@/lib/styles";
import { CheckIcon, PlateIcon } from "./Icons";

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function customMacros(meal: DietMeal, picks: DietDayPicks): MacroValues | undefined {
  return picks.customMeals[meal.key];
}

export function mealSummary(meal: DietMeal, picks: DietDayPicks): string {
  if (meal.key === "almoco") {
    const a = picks.almoco;
    if (a.custom) return `Fora da dieta — ${customMacros(meal, picks)?.kcal ?? 0} kcal`;
    if (a.skipped) return "Pulada hoje";
    if (a.carb == null && a.leg == null && a.prot == null) return "Escolha carboidrato, leguminosa e proteína";
    const parts: string[] = [];
    const grp = (k: string) => meal.groups?.radioGroups.find((g) => g.key === k);
    if (a.carb != null) parts.push(grp("carb")?.items[a.carb] ?? "");
    if (a.leg != null) parts.push(grp("leg")?.items[a.leg] ?? "");
    if (a.prot != null) parts.push(grp("prot")?.items[a.prot] ?? "");
    return truncate(parts.filter(Boolean).join(" + "), 40);
  }
  const idx = meal.key === "sobremesa" ? picks.sobremesa : picks[meal.key as "cafe" | "lanche" | "jantar"];
  if (idx == null) return "Toque para escolher";
  if (idx === "none") return "Sem sobremesa hoje";
  if (idx === "skip") return "Pulada hoje";
  if (idx === "custom") return `Fora da dieta — ${customMacros(meal, picks)?.kcal ?? 0} kcal`;
  return truncate(meal.options?.[idx as number]?.label ?? "", 42);
}

type CustomForm = { kcal: string; p: string; c: string; g: string };
const EMPTY_CUSTOM_FORM: CustomForm = { kcal: "", p: "", c: "", g: "" };

/** Expandable meal card: header always visible (chevron + status badge), body animates open/closed via grid-template-rows. */
export function MealCard({
  meal, picks, isOpen, onToggleOpen, onChange,
}: {
  meal: DietMeal;
  picks: DietDayPicks;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (next: DietDayPicks) => void;
}) {
  const done = isMealDone(meal, picks);
  const skipped = isMealSkipped(meal, picks);
  const custom = isMealCustom(meal, picks);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomForm>(EMPTY_CUSTOM_FORM);

  function selectSimple(mealKey: "cafe" | "lanche" | "jantar", idx: number) {
    onChange({ ...picks, [mealKey]: idx });
  }
  function selectSobremesa(idx: number | "none") {
    onChange({ ...picks, sobremesa: idx });
  }
  function setPortion(portionKey: "cafePortion" | "lanchePortion" | "jantarPortion", val: number) {
    onChange({ ...picks, [portionKey]: val });
  }
  function selectAlmocoGroup(groupKey: keyof AlmocoPicks, idx: number) {
    onChange({ ...picks, almoco: { ...picks.almoco, [groupKey]: idx, skipped: false, custom: false } });
  }
  function toggleAlmocoFruta() {
    onChange({ ...picks, almoco: { ...picks.almoco, fruta: !picks.almoco.fruta } });
  }
  function skipMeal() {
    if (meal.key === "almoco") onChange({ ...picks, almoco: { ...picks.almoco, skipped: true, custom: false } });
    else onChange({ ...picks, [meal.key]: "skip" });
  }
  function unskipMeal() {
    if (meal.key === "almoco") onChange({ ...picks, almoco: { ...picks.almoco, skipped: false } });
    else onChange({ ...picks, [meal.key]: null });
  }
  function openCustomForm() {
    const existing = customMacros(meal, picks);
    setCustomForm(existing ? { kcal: String(existing.kcal), p: String(existing.p), c: String(existing.c), g: String(existing.g) } : EMPTY_CUSTOM_FORM);
    setCustomFormOpen(true);
  }
  function saveCustom() {
    const macros: MacroValues = {
      kcal: parseFloat(customForm.kcal) || 0,
      p: parseFloat(customForm.p) || 0,
      c: parseFloat(customForm.c) || 0,
      g: parseFloat(customForm.g) || 0,
    };
    const nextCustomMeals = { ...picks.customMeals, [meal.key]: macros };
    if (meal.key === "almoco") {
      onChange({ ...picks, customMeals: nextCustomMeals, almoco: { ...picks.almoco, custom: true, skipped: false } });
    } else {
      onChange({ ...picks, customMeals: nextCustomMeals, [meal.key]: "custom" });
    }
    setCustomFormOpen(false);
  }
  function unsetCustom() {
    if (meal.key === "almoco") onChange({ ...picks, almoco: { ...picks.almoco, custom: false } });
    else onChange({ ...picks, [meal.key]: null });
  }

  const badgeStyle = skipped
    ? { background: C.steelSoft, border: `1px solid ${C.steelEdge}`, color: C.steelLight }
    : done
    ? { background: C.honeySoft, border: `1px solid ${C.honeyEdge}`, color: C.honeyText }
    : { background: "transparent", border: "1px solid transparent", color: "transparent" };

  const currentCustom = customMacros(meal, picks);

  return (
    <div style={styles.dietMealCard} onClick={(e) => e.stopPropagation()}>
      <div style={styles.dietMealHead} onClick={onToggleOpen}>
        <div style={styles.dietMealIcon}><PlateIcon size={16} color={C.honeyText} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.dietMealName}>{meal.label}</div>
          <div style={styles.dietMealSummary}>{mealSummary(meal, picks)}</div>
        </div>
        {(done || skipped) && <div style={{ ...styles.dietMealBadge, ...badgeStyle }}>{skipped ? "–" : <CheckIcon size={10} color={C.honeyText} />}</div>}
        <div style={{ ...styles.mealChevron, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
      </div>

      <div style={{ ...styles.mealBodyWrap, gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          {skipped ? (
            <div style={{ ...styles.dietMealBody, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, color: C.midGray, textAlign: "center", padding: "6px 0 10px" }}>Refeição pulada — não conta kcal.</div>
              <button style={styles.dietShopReset} onClick={unskipMeal}>Desfazer</button>
            </div>
          ) : custom && !customFormOpen ? (
            <div style={{ ...styles.dietMealBody, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, color: C.midGray, textAlign: "center", padding: "6px 0 4px" }}>
                Fora da dieta — {currentCustom?.kcal ?? 0} kcal (P {currentCustom?.p ?? 0}g · C {currentCustom?.c ?? 0}g · G {currentCustom?.g ?? 0}g)
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                <button style={styles.dietShopReset} onClick={openCustomForm}>Editar</button>
                <button style={styles.dietShopReset} onClick={unsetCustom}>Desfazer</button>
              </div>
            </div>
          ) : customFormOpen ? (
            <div style={{ ...styles.dietMealBody, borderTop: `1px solid ${C.line}` }}>
              <div style={styles.dietGroupTitle}>Comi fora da dieta</div>
              <div style={styles.dietMeasureGrid}>
                {([
                  { key: "kcal" as const, label: "Kcal" },
                  { key: "p" as const, label: "Proteína (g)" },
                  { key: "c" as const, label: "Carbo (g)" },
                  { key: "g" as const, label: "Gordura (g)" },
                ]).map((f) => (
                  <div key={f.key} style={styles.dietMeasureField}>
                    <div style={styles.dietMeasureLabel}>{f.label}</div>
                    <input
                      style={styles.dietMeasureInput}
                      inputMode="decimal"
                      value={customForm[f.key]}
                      onChange={(e) => setCustomForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...styles.dietPortionBtn, flex: 1 }} onClick={() => setCustomFormOpen(false)}>Cancelar</button>
                <button style={{ ...styles.dietPortionBtn, ...styles.dietPortionBtnActive, flex: 1 }} onClick={saveCustom}>Salvar</button>
              </div>
            </div>
          ) : (
            <div style={{ ...styles.dietMealBody, borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", marginBottom: 2 }}>
                <button style={styles.dietShopReset} onClick={openCustomForm}>Comi fora da dieta</button>
                {!meal.hasNoneOption && <button style={styles.dietShopReset} onClick={skipMeal}>Pular refeição</button>}
              </div>
              {meal.kind === "list" && meal.options && (
                <>
                  {meal.options.map((opt, i) => {
                    const idx = meal.key === "sobremesa" ? picks.sobremesa : picks[meal.key as "cafe" | "lanche" | "jantar"];
                    const selected = idx === i;
                    return (
                      <div
                        key={i}
                        style={{ ...styles.dietOptionRow, ...(selected ? styles.dietOptionRowSelected : {}) }}
                        onClick={() => (meal.key === "sobremesa" ? selectSobremesa(i) : selectSimple(meal.key as "cafe" | "lanche" | "jantar", i))}
                      >
                        <div style={{ ...styles.dietRadio, ...(selected ? styles.dietRadioSelected : {}) }}>{selected && <CheckIcon size={9} />}</div>
                        <div style={{ flex: 1 }}>
                          <div style={styles.dietOptionLabel}>{opt.label}</div>
                          <div style={styles.dietOptionMacro}>P {opt.p}g · C {opt.c}g · G {opt.g}g</div>
                        </div>
                        <div style={styles.dietOptionKcal}>{opt.kcal} kcal</div>
                      </div>
                    );
                  })}
                  {meal.hasNoneOption && (
                    <div
                      style={{ ...styles.dietOptionRow, ...(picks.sobremesa === "none" ? styles.dietOptionRowSelected : {}) }}
                      onClick={() => selectSobremesa("none")}
                    >
                      <div style={{ ...styles.dietRadio, ...(picks.sobremesa === "none" ? styles.dietRadioSelected : {}) }}>{picks.sobremesa === "none" && <CheckIcon size={9} />}</div>
                      <div style={styles.dietOptionLabel}>Não vou comer sobremesa hoje</div>
                    </div>
                  )}
                  {meal.allowPortion && (
                    <div style={styles.dietPortionRow}>
                      {[0.5, 1, 1.5, 2].map((v) => {
                        const portionKey = (meal.key + "Portion") as "cafePortion" | "lanchePortion" | "jantarPortion";
                        const active = picks[portionKey] === v;
                        return (
                          <button
                            key={v}
                            style={{ ...styles.dietPortionBtn, ...(active ? styles.dietPortionBtnActive : {}) }}
                            onClick={() => setPortion(portionKey, v)}
                          >
                            {v}x
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {meal.kind === "builder" && meal.groups && (
                <>
                  {meal.groups.radioGroups.map((grp) => (
                    <div key={grp.key}>
                      <div style={styles.dietGroupTitle}>{grp.title}</div>
                      {grp.items.map((label, i) => {
                        const selected = picks.almoco[grp.key as keyof AlmocoPicks] === i;
                        return (
                          <div
                            key={i}
                            style={{ ...styles.dietOptionRow, padding: "7px 10px", ...(selected ? styles.dietOptionRowSelected : {}) }}
                            onClick={() => selectAlmocoGroup(grp.key as keyof AlmocoPicks, i)}
                          >
                            <div style={{ ...styles.dietRadio, ...(selected ? styles.dietRadioSelected : {}) }}>{selected && <CheckIcon size={9} />}</div>
                            <div style={styles.dietOptionLabel}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "9px 10px" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{meal.groups.toggle.label}</span>
                    <div
                      onClick={toggleAlmocoFruta}
                      style={{ ...styles.fruitSwitchTrack, background: picks.almoco.fruta ? C.honeySoft : "rgba(13,27,42,.08)" }}
                    >
                      <div style={{ ...styles.fruitSwitchThumb, left: picks.almoco.fruta ? 20 : 2, background: picks.almoco.fruta ? C.honey : "#FFFFFF" }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** First meal in plan order that isn't done yet today; null once everything's done. */
export function findNextMeal(meals: DietMeal[], picks: DietDayPicks): DietMeal | null {
  return meals.find((m) => !isMealDone(m, picks)) ?? null;
}
