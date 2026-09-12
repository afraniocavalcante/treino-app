"use client";

import { isMealDone, type AlmocoPicks, type DietDayPicks, type DietMeal } from "@/lib/diet";
import { C, styles } from "@/lib/styles";

export const MEAL_ICON: Record<string, string> = {
  cafe: "☕", almoco: "🍽️", lanche: "🍎", jantar: "🌙", sobremesa: "🍰",
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function mealSummary(meal: DietMeal, picks: DietDayPicks): string {
  if (meal.key === "almoco") {
    const a = picks.almoco;
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
  return truncate(meal.options?.[idx as number]?.label ?? "", 42);
}

/** Expandable meal card: shows the summary/badge collapsed, the full picker (list or almoço builder) when open. */
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
    onChange({ ...picks, almoco: { ...picks.almoco, [groupKey]: idx } });
  }
  function toggleAlmocoFruta() {
    onChange({ ...picks, almoco: { ...picks.almoco, fruta: !picks.almoco.fruta } });
  }

  return (
    <div style={styles.dietMealCard}>
      <div style={styles.dietMealHead} onClick={onToggleOpen}>
        <div style={styles.dietMealIcon}>{MEAL_ICON[meal.key] ?? "🍴"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.dietMealName}>{meal.label}</div>
          <div style={styles.dietMealSummary}>{mealSummary(meal, picks)}</div>
        </div>
        <div style={{ ...styles.dietMealBadge, background: done ? C.accent : "rgba(255,255,255,.06)" }}>{done ? "✓" : ""}</div>
      </div>

      {isOpen && (
        <div style={styles.dietMealBody}>
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
                    <div style={{ ...styles.dietRadio, ...(selected ? styles.dietRadioSelected : {}) }} />
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
                  <div style={{ ...styles.dietRadio, ...(picks.sobremesa === "none" ? styles.dietRadioSelected : {}) }} />
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
                        <div style={{ ...styles.dietRadio, ...(selected ? styles.dietRadioSelected : {}) }} />
                        <div style={styles.dietOptionLabel}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div
                style={{ ...styles.dietOptionRow, padding: "7px 10px", marginTop: 4, ...(picks.almoco.fruta ? styles.dietOptionRowSelected : {}) }}
                onClick={toggleAlmocoFruta}
              >
                <div style={{ ...styles.dietRadio, borderRadius: 5, ...(picks.almoco.fruta ? styles.dietRadioSelected : {}) }} />
                <div style={styles.dietOptionLabel}>{meal.groups.toggle.label}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** First meal in plan order that isn't done yet today; null once everything's done. */
export function findNextMeal(meals: DietMeal[], picks: DietDayPicks): DietMeal | null {
  return meals.find((m) => !isMealDone(m, picks)) ?? null;
}
