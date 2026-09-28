"use client";
import { useRef, useState } from "react";
import { useStore } from "../store/store";
import { computeProductLife, isRunningLow } from "../lib/derived";
import { formatDateShort } from "../lib/dates";
import { ChevronLeft } from "../components/icons";
import { Flip } from "../components/Ring";
import { Overlay } from "../components/Overlay";

export function ProductDetail({
  productId,
  onClose,
  onAddToList,
}: {
  productId: string;
  onClose: () => void;
  onAddToList: () => void;
}) {
  const { data, setStock, archiveProduct } = useStore();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const product = data.products.find((p) => p.id === productId);
  if (!product) return null;

  const { daysUntilExpire } = computeProductLife(product);
  const low = isRunningLow(product);
  const finished = product.stock === 0;
  const arcColor = finished ? "#BDB2A1" : low ? "#8E3D1E" : "#5C6540";

  const status = finished ? "acabou" : "ativo";
  const statusBorder = finished ? "#D3CABB" : "#CBD3B7";
  const statusBg = finished ? "#F5F0E8" : "#E7EBDD";
  const statusColor = finished ? "#5C5245" : "#39441F";

  const routinesUsing = data.routines
    .filter(
      (r) => r.status === "active" && data.routineSteps.some((s) => r.stepOrder.includes(s.id) && s.productId === product.id),
    )
    .map((r) => r.name);

  const rows = [
    { label: "categoria", value: product.category },
    { label: "aberto em", value: formatDateShort(product.openedAt) },
    { label: "validade", value: `${product.shelfLifeDays} dias · ${daysUntilExpire > 0 ? `vence em ${daysUntilExpire} dias` : "vencido"}` },
    { label: "nas rotinas", value: routinesUsing.length ? routinesUsing.join(", ") : "nenhuma" },
  ];

  const size = 190;
  const r = 92;
  const cc = size / 2;
  const dasharray = 2 * Math.PI * r;
  const dashoffset = dasharray * (1 - product.stock / 100);

  const pid = product.id;

  function setStockFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setStock(pid, pct);
  }

  function onTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setStockFromClientX(e.clientX);
  }

  function onTrackPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setStockFromClientX(e.clientX);
  }

  function onTrackPointerUp() {
    setDragging(false);
  }

  return (
    <Overlay onSwipeBack={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 18px 6px" }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 300, color: "#4A423A", padding: 6 }}>
          <ChevronLeft />
          voltar
        </button>
        <span
          style={{
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${statusBorder}`,
            background: statusBg,
            color: statusColor,
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "18px 22px 26px" }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, display: "block", transform: "rotate(-90deg)" }}>
            <circle cx={cc} cy={cc} r={r} fill="none" stroke="#DED6C9" strokeWidth="3" />
            <circle
              cx={cc}
              cy={cc}
              r={r}
              fill="none"
              stroke={arcColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dashoffset 520ms cubic-bezier(.2,.7,.2,1) 120ms" }}
            />
            <circle cx={cc} cy={cc} r="82" fill="#F0EAE0" stroke="#D3CABB" strokeWidth="1" />
          </svg>
          {product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt=""
              style={{ position: "absolute", top: 13, left: 13, width: 164, height: 164, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, letterSpacing: ".04em", color: "#5C5245" }}>
                foto do produto
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, textAlign: "center" }}>
          <div style={{ fontSize: 21, fontWeight: 400, letterSpacing: "-.01em" }}>{product.name}</div>
          <div style={{ fontSize: 13, fontWeight: 300, color: "#5C5245", letterSpacing: ".04em" }}>{product.brand}</div>
        </div>
      </div>

      <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>estoque</span>
            <span style={{ fontSize: 15, fontWeight: 400, color: "#191715" }}>
              <Flip value={`${product.stock}%`} />
            </span>
          </div>
          <div
            ref={trackRef}
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            style={{ height: 22, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none" }}
          >
            <div style={{ position: "relative", width: "100%", height: 4, borderRadius: 999, background: "#E6DFD3" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  width: `${product.stock}%`,
                  background: arcColor,
                  transition: dragging ? "none" : "width 200ms ease",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${product.stock}%`,
                  width: 18,
                  height: 18,
                  margin: "-9px 0 0 -9px",
                  borderRadius: 999,
                  background: "#FFFFFF",
                  border: "1px solid #BDB2A1",
                  transition: dragging ? "none" : "left 200ms ease",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setStock(product.id, product.stock - 10)}
              style={{ flex: 1, padding: 9, border: "1px solid #D3CABB", borderRadius: 999, fontSize: 12, color: "#4A423A" }}
            >
              −10%
            </button>
            <button
              onClick={() => setStock(product.id, product.stock + 10)}
              style={{ flex: 1, padding: 9, border: "1px solid #D3CABB", borderRadius: 999, fontSize: 12, color: "#4A423A" }}
            >
              +10%
            </button>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, overflow: "hidden" }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "13px 16px", borderTop: "1px solid #E6DFD3" }}
            >
              <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#5C5245", flex: "none" }}>{row.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 300, color: "#191715", textAlign: "right" }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>observações</span>
          <span style={{ fontSize: 13.5, fontWeight: 300, color: "#4A423A", lineHeight: 1.6 }}>
            {product.notes || "Sem observações."}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
          <button
            onClick={() => {
              archiveProduct(product.id);
              onClose();
            }}
            style={{ flex: 1, padding: 12, borderRadius: 999, border: "1px solid #D3CABB", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "#4A423A" }}
          >
            arquivar
          </button>
          <button
            onClick={onAddToList}
            style={{ flex: 1, padding: 12, borderRadius: 999, background: "#191715", color: "#FFFFFF", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}
          >
            recomprar
          </button>
        </div>
      </div>
    </Overlay>
  );
}
