"use client";
import { useState } from "react";
import { useStore } from "../store/store";
import {
  computeBestStreak,
  computeMonthPct,
  computeStreak,
  computeWeeklyAdherence,
} from "../lib/derived";
import { formatDateMedium, todayISO } from "../lib/dates";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#FFFFFF",
        border: "1px solid #D3CABB",
        borderRadius: 5,
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#5C5245" }}>
        {label}
      </span>
      <span style={{ fontSize: 21, fontWeight: 400, color: "#191715", letterSpacing: "-.01em" }}>{value}</span>
      {sub && <span style={{ fontSize: 10.5, fontWeight: 300, color: "#5C5245" }}>{sub}</span>}
    </div>
  );
}

export function InsightsScreen() {
  const { data } = useStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const streak = computeStreak(data);
  const bestStreak = computeBestStreak(data);
  const monthPct = computeMonthPct(data);
  const weeks = computeWeeklyAdherence(data, 12);

  const hasData = weeks.some((w) => w.totalDays > 0);
  const maxPct = Math.max(100, ...weeks.map((w) => w.pct));
  const activeIdx = selected ?? weeks.length - 1;
  const activeWeek = weeks[activeIdx];

  return (
    <div>
      <div style={{ padding: "34px 0 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#5C5245", fontWeight: 500 }}>
          dados
        </div>
        <div style={{ fontSize: 25, fontWeight: 300, letterSpacing: "-.01em", color: "#191715" }}>Insights</div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 0 20px" }}>
        <StatTile label="streak atual" value={`${streak}`} sub="dias seguidos" />
        <StatTile label="melhor streak" value={`${bestStreak}`} sub="dias seguidos" />
        <StatTile label="este mês" value={`${monthPct}%`} sub="dos dias completos" />
      </div>

      <div style={{ padding: 0 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: "18px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>
              aderência semanal
            </span>
            <button
              onClick={() => setShowTable((v) => !v)}
              style={{ fontSize: 10.5, letterSpacing: ".04em", color: "#5C6540", borderBottom: "1px solid #CBD3B7" }}
            >
              {showTable ? "ver gráfico" : "ver como lista"}
            </button>
          </div>

          {!hasData ? (
            <div style={{ padding: "24px 0", fontSize: 12.5, fontWeight: 300, color: "#5C5245", textAlign: "center" }}>
              Marque alguns passos na rotina pra começar a ver seus dados aqui.
            </div>
          ) : showTable ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
              {weeks
                .slice()
                .reverse()
                .map((w, i) => (
                  <div
                    key={w.weekStart}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 2px",
                      borderTop: i === 0 ? "none" : "1px solid #E6DFD3",
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 300, color: "#4A423A" }}>
                      {formatDateMedium(w.weekStart)} – {formatDateMedium(w.weekEnd)}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 400, color: "#191715" }}>
                      {w.pct}% · {w.completedDays}/{w.totalDays}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, marginTop: 14 }}>
                {weeks.map((w, i) => {
                  const isActive = i === activeIdx;
                  const isCurrent = i === weeks.length - 1;
                  const heightPct = Math.max(3, (w.pct / maxPct) * 100);
                  return (
                    <button
                      key={w.weekStart}
                      onClick={() => setSelected(i === selected ? null : i)}
                      style={{
                        flex: 1,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${heightPct}%`,
                          background: isActive ? "#5C6540" : "#B9C29B",
                          borderRadius: "4px 4px 1px 1px",
                          transition: "height 320ms cubic-bezier(.2,.7,.2,1), background 150ms ease",
                          outline: isCurrent ? "1px dashed #8A9268" : "none",
                          outlineOffset: 2,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {weeks.map((w, i) => (
                  <div key={w.weekStart} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                    {(i === 0 || i === weeks.length - 1 || i === activeIdx) && (
                      <span style={{ fontSize: 8.5, fontWeight: 300, color: "#5C5245", letterSpacing: "-.01em" }}>
                        {formatDateMedium(w.weekStart).split(" de ")[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {activeWeek && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid #E6DFD3",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 300, color: "#4A423A" }}>
                    {formatDateMedium(activeWeek.weekStart)} – {formatDateMedium(activeWeek.weekEnd)}
                    {activeWeek.weekEnd === todayISO() ? " · essa semana" : ""}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 400, color: "#191715" }}>
                    {activeWeek.pct}%{" "}
                    <span style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245" }}>
                      ({activeWeek.completedDays}/{activeWeek.totalDays})
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 0 8px" }}>
        <p style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", lineHeight: 1.5 }}>
          Uma semana conta como completa nos dias em que pelo menos uma rotina ativa foi fechada por inteiro.
        </p>
      </div>
    </div>
  );
}
