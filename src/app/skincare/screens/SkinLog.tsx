"use client";
import { useState } from "react";
import { useStore } from "../store/store";
import { formatDateMedium, formatRelative } from "../lib/dates";
import { EmptyState } from "../components/States";
import { HexIcon, XIcon } from "../components/icons";

interface TimelineNote {
  kind: "note";
  date: string;
  text: string;
}
interface TimelinePhoto {
  kind: "photo";
  id: string;
  date: string;
  tags: string[];
  note: string;
  productIds: string[];
  routineNames: string[];
  photoUrl: string | null;
}
type TimelineItem = TimelineNote | TimelinePhoto;

export function SkinLogScreen({
  onOpenCompare,
}: {
  onOpenCompare: (ids: [string, string]) => void;
}) {
  const { data } = useStore();
  const [cmpMode, setCmpMode] = useState(false);
  const [cmpSel, setCmpSel] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const photoItems: TimelinePhoto[] = data.skinLogs
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((l) => ({
      kind: "photo",
      id: l.id,
      date: l.date,
      tags: l.tags,
      note: l.note,
      productIds: l.productIdsInUse,
      routineNames: l.routineIdsInUse
        .map((rid) => data.routines.find((r) => r.id === rid)?.name)
        .filter((n): n is string => !!n),
      photoUrl: l.photoUrl,
    }));

  const noteItems: TimelineNote[] = data.checkins
    .filter((c) => c.note.trim().length > 0)
    .map((c) => ({ kind: "note", date: c.date, text: c.note }));

  const timeline: TimelineItem[] = [...photoItems, ...noteItems].sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );

  function toggleCompareMode() {
    setCmpMode((v) => !v);
    setCmpSel([]);
  }

  function selectForCompare(id: string) {
    setCmpSel((sel) => {
      if (sel.includes(id)) return sel.filter((x) => x !== id);
      const next = [...sel, id];
      return next.length > 2 ? next.slice(-2) : next;
    });
  }

  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, padding: "0 0 16px" }}>
        <button
          onClick={toggleCompareMode}
          style={{
            fontSize: 11.5,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${cmpMode ? "#191715" : "#D3CABB"}`,
            background: cmpMode ? "#191715" : "#FFFFFF",
            color: cmpMode ? "#FFFFFF" : "#4A423A",
          }}
        >
          {cmpMode ? `${cmpSel.length} de 2` : "comparar"}
        </button>
      </div>

      {photoItems.length === 0 ? (
        <EmptyState
          shape="square"
          title="Sem registros"
          body="A primeira foto vira a referência de comparação das próximas."
        />
      ) : (
        <div className="cascade" style={{ padding: 0 }}>
          {timeline.map((item, idx) => {
            const isLast = idx === timeline.length - 1;
            const milestoneIndex = photoItems.findIndex((p) => p.id === (item.kind === "photo" ? item.id : ""));
            const nth = item.kind === "photo" ? photoItems.length - milestoneIndex : 0;
            const isMilestone = item.kind === "photo" && nth > 0 && nth % 5 === 0;

            return (
              <div key={`${item.kind}-${item.date}-${idx}`} style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 9, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
                  {item.kind === "photo" ? (
                    <span
                      style={{
                        width: cmpSel.includes(item.id) ? 8 : 7,
                        height: cmpSel.includes(item.id) ? 8 : 7,
                        borderRadius: 999,
                        background: cmpSel.includes(item.id) ? "#5C6540" : "#B9AE99",
                        border: `1px solid ${cmpSel.includes(item.id) ? "#5C6540" : "transparent"}`,
                        flex: "none",
                      }}
                    />
                  ) : (
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "transparent", border: "1px solid #BDB2A1", flex: "none" }} />
                  )}
                  {!isLast && <span style={{ flex: 1, width: 1, background: "#D9D1C3" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 18 }}>
                  {isMilestone && item.kind === "photo" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                        padding: "12px 14px",
                        background: "#E7EBDD",
                        border: "1px solid #CBD3B7",
                        borderRadius: 4,
                      }}
                    >
                      <HexIcon size={17} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#39441F" }}>Sua {nth}ª entrada</div>
                      <button
                        onClick={() => {
                          const first = photoItems[photoItems.length - 1];
                          if (first) onOpenCompare([first.id, item.id]);
                        }}
                        style={{ flex: "none", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "#39441F", borderBottom: "1px solid #CBD3B7" }}
                      >
                        comparar
                      </button>
                    </div>
                  )}
                  {item.kind === "note" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "2px 2px 4px" }}>
                      <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5C5245" }}>
                        {formatDateMedium(item.date)} · nota do dia
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 300, color: "#4A423A", lineHeight: 1.55 }}>{item.text}</div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        cmpMode ? selectForCompare(item.id) : setExpanded((e) => (e === item.id ? null : item.id))
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        width: "100%",
                        textAlign: "left",
                        background: "#FFFFFF",
                        border: `1px solid ${cmpSel.includes(item.id) ? "#5C6540" : "#D3CABB"}`,
                        borderRadius: 5,
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 400 }}>{formatDateMedium(item.date)}</span>
                          {item.routineNames.map((name) => (
                            <span
                              key={name}
                              style={{
                                fontSize: 9.5,
                                letterSpacing: ".06em",
                                textTransform: "uppercase",
                                color: "#4A423A",
                                border: "1px solid #D3CABB",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 300, color: "#5C5245", letterSpacing: ".04em", flex: "none" }}>{formatRelative(item.date)}</span>
                      </div>
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewerUrl(item.photoUrl);
                          }}
                          style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 3, border: "1px solid #D3CABB", objectFit: "cover", display: "block", cursor: "zoom-in" }}
                        />
                      ) : (
                        <div
                          className="photo-stripe"
                          style={{
                            width: "100%",
                            aspectRatio: "4 / 3",
                            borderRadius: 3,
                            border: "1px solid #D3CABB",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "flex-start",
                            padding: 9,
                          }}
                        >
                          <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 9.5, letterSpacing: ".04em", color: "#5C5245", background: "#FFFFFF", padding: "3px 6px", borderRadius: 2 }}>
                            foto da pele
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {item.tags.map((t) => (
                          <span key={t} style={{ fontSize: 10.5, letterSpacing: ".06em", padding: "4px 10px", borderRadius: 999, border: "1px solid #D3CABB", color: "#4A423A" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      {!cmpMode && expanded === item.id && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", borderTop: "1px solid #E6DFD3", paddingTop: 13 }}>
                          <div style={{ fontSize: 13, fontWeight: 300, color: "#4A423A", lineHeight: 1.6 }}>{item.note}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>em uso no período</div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              {item.productIds.map((pid) => {
                                const product = data.products.find((p) => p.id === pid);
                                return (
                                  <div
                                    key={pid}
                                    style={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: 999,
                                      background: "#F0EAE0",
                                      border: "1px solid #D3CABB",
                                      marginRight: -7,
                                      overflow: "hidden",
                                      flex: "none",
                                    }}
                                  >
                                    {product?.photoUrl && (
                                      <img src={product.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cmpMode && cmpSel.length === 2 && (
        <div style={{ padding: "6px 0 0" }}>
          <button
            onClick={() => onOpenCompare([cmpSel[0], cmpSel[1]])}
            style={{ width: "100%", padding: 13, borderRadius: 999, background: "#191715", color: "#FFFFFF", fontSize: 12.5, letterSpacing: ".06em", textTransform: "uppercase" }}
          >
            ver comparação
          </button>
        </div>
      )}

      {viewerUrl && (
        <div
          className="anim-veil-in"
          onClick={() => setViewerUrl(null)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 90,
            background: "rgba(25,23,21,.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "env(safe-area-inset-top) 22px env(safe-area-inset-bottom)",
          }}
        >
          <img
            src={viewerUrl}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }}
          />
          <button
            onClick={() => setViewerUrl(null)}
            aria-label="fechar"
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top) + 18px)",
              right: 22,
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(255,255,255,.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XIcon size={14} color="#FFFFFF" />
          </button>
        </div>
      )}
    </div>
  );
}
