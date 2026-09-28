"use client";
import { useStore } from "../store/store";
import { daysBetween, formatDateMedium, todayISO } from "../lib/dates";
import { computeStreak } from "../lib/derived";
import { ChevronLeft } from "../components/icons";
import { Overlay } from "../components/Overlay";

export function CompareScreen({ ids, onClose }: { ids: [string, string]; onClose: () => void }) {
  const { data } = useStore();
  const entries = ids
    .map((id) => data.skinLogs.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (entries.length < 2) return null;

  const [older, newer] = entries;
  const span = `${new Date(older.date).getDate().toString().padStart(2, "0")} — ${new Date(newer.date).getDate().toString().padStart(2, "0")}`;

  const sameProducts = older.productIdsInUse.filter((id) => newer.productIdsInUse.includes(id));
  const daysSpan = daysBetween(older.date, newer.date);
  const streak = computeStreak(data, todayISO());

  const summary = `${daysSpan} dias entre os registros. ${sameProducts.length} produto${sameProducts.length === 1 ? "" : "s"} em uso nas duas datas. Streak atual: ${streak} dias.`;

  return (
    <Overlay onSwipeBack={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 18px 10px" }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 300, color: "#4A423A", padding: 6 }}>
          <ChevronLeft />
          skin log
        </button>
        <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#5C5245" }}>{span}</span>
      </div>
      <div style={{ padding: "14px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[older, newer].map((entry) => (
          <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {entry.photoUrl ? (
              <img
                src={entry.photoUrl}
                alt=""
                style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 3, border: "1px solid #D3CABB", objectFit: "cover" }}
              />
            ) : (
              <div className="photo-stripe" style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 3, border: "1px solid #D3CABB" }} />
            )}
            <div style={{ fontSize: 12.5, fontWeight: 400 }}>{formatDateMedium(entry.date)}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {entry.tags.map((t) => (
                <span key={t} style={{ fontSize: 10, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 999, border: "1px solid #D3CABB", color: "#4A423A" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: "8px 22px", padding: 16, background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>entre as duas datas</span>
        <span style={{ fontSize: 13.5, fontWeight: 300, color: "#4A423A", lineHeight: 1.6 }}>{summary}</span>
      </div>
    </Overlay>
  );
}
