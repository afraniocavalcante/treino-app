"use client";

import type { ReactNode } from "react";
import { PlusIcon } from "./icons";

export function Sheet({
  title,
  closing,
  onClose,
  onConfirm,
  ctaLabel,
  ctaDisabled,
  photoLabel,
  photoUrl,
  onPhotoChange,
  children,
}: {
  title: string;
  closing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ctaLabel: string;
  ctaDisabled?: boolean;
  photoLabel?: string;
  photoUrl?: string | null;
  onPhotoChange?: (file: File) => void;
  children: ReactNode;
}) {
  return (
    <div
      className={closing ? "anim-veil-out" : "anim-veil-in"}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        background: "rgba(25,23,21,.32)",
      }}
      onClick={onClose}
    >
      <div
        className={closing ? "anim-sheet-down" : "anim-sheet-up"}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "#FFFFFF",
          borderRadius: "8px 8px 0 0",
          padding: "10px 0 26px",
          maxHeight: "88vh",
          overflowY: "auto",
          overscrollBehaviorY: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 14px" }}>
          <span style={{ width: 38, height: 3, borderRadius: 999, background: "#D3CABB" }} />
        </div>
        <div
          style={{
            padding: "0 20px 18px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 400, letterSpacing: "-.01em" }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 12, fontWeight: 300, color: "#5C5245" }}>
            cancelar
          </button>
        </div>
        {photoLabel != null && (
          <div style={{ padding: "0 20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <label
                style={{
                  width: 76,
                  height: 76,
                  flex: "none",
                  borderRadius: 999,
                  border: photoUrl ? "1px solid #D3CABB" : "1px dashed #BDB2A1",
                  background: photoUrl ? "transparent" : "#F0EAE0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <PlusIcon size={18} color="#5C5245" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPhotoChange?.(file);
                    e.target.value = "";
                  }}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 400 }}>{photoLabel}</div>
                <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", lineHeight: 1.5 }}>
                  Câmera ou galeria. Sem foto, o app usa o ícone da categoria.
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="stagger" style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
          <button
            onClick={onConfirm}
            disabled={ctaDisabled}
            style={{
              marginTop: 6,
              width: "100%",
              padding: 14,
              borderRadius: 999,
              background: ctaDisabled ? "#BDB2A1" : "#191715",
              color: "#FFFFFF",
              fontSize: 12.5,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              cursor: ctaDisabled ? "default" : "pointer",
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SheetField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid #D3CABB",
          borderRadius: 4,
          background: "#F5F0E8",
          padding: "11px 12px",
          fontSize: 13.5,
          fontWeight: 300,
          color: "#191715",
          outline: "none",
          width: "100%",
        }}
      />
    </label>
  );
}

export function SheetChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                fontSize: 11.5,
                letterSpacing: ".04em",
                padding: "7px 13px",
                borderRadius: 999,
                border: `1px solid ${active ? "#B9AE99" : "#D3CABB"}`,
                background: active ? "#E2DDCB" : "#FFFFFF",
                color: active ? "#191715" : "#4A423A",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SheetMultiChips({
  label,
  options,
  value,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              style={{
                fontSize: 11.5,
                letterSpacing: ".04em",
                padding: "7px 13px",
                borderRadius: 999,
                border: `1px solid ${active ? "#B9AE99" : "#D3CABB"}`,
                background: active ? "#E2DDCB" : "#FFFFFF",
                color: active ? "#191715" : "#4A423A",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
