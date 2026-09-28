"use client";

import type { Category } from "../lib/types";

const stroke = "#4A423A";

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: Category;
  size?: number;
}) {
  switch (category) {
    case "limpeza":
      return (
        <svg width={size} height={size} viewBox="0 0 18 18">
          <circle cx="7" cy="8" r="4.2" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="13" cy="12.5" r="2.4" fill="none" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );
    case "tratamento":
      return (
        <svg width={size} height={size} viewBox="0 0 18 18">
          <rect
            x="4.6"
            y="4.6"
            width="8.8"
            height="8.8"
            fill="none"
            stroke={stroke}
            strokeWidth="1.1"
            transform="rotate(45 9 9)"
          />
        </svg>
      );
    case "hidratacao":
      return (
        <svg width={size} height={size} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="6.4" fill="none" stroke={stroke} strokeWidth="1.1" />
          <line x1="3.2" y1="10.4" x2="14.8" y2="10.4" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );
    case "protecao":
      return (
        <svg width={size} height={size} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="3.6" fill="none" stroke={stroke} strokeWidth="1.1" />
          <line x1="9" y1="0.8" x2="9" y2="3" stroke={stroke} strokeWidth="1.1" />
          <line x1="9" y1="15" x2="9" y2="17.2" stroke={stroke} strokeWidth="1.1" />
          <line x1="0.8" y1="9" x2="3" y2="9" stroke={stroke} strokeWidth="1.1" />
          <line x1="15" y1="9" x2="17.2" y2="9" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );
  }
}

export function CheckIcon({
  fill,
  strokeColor,
  showTick,
}: {
  fill: string;
  strokeColor: string;
  showTick: boolean;
}) {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" style={{ display: "block" }}>
      <circle
        cx="11"
        cy="11"
        r="10"
        fill={fill}
        stroke={strokeColor}
        strokeWidth="1.2"
        style={{ transition: "fill 260ms ease, stroke 260ms ease" }}
      />
      <polyline
        points="6.6,11.2 9.6,14 15.2,8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={showTick ? 1 : 0}
        style={{ transition: "opacity 200ms ease" }}
      />
    </svg>
  );
}

export function HexIcon({ size = 22, color = "#4F6440" }: { size?: number; color?: string }) {
  const h = (size * 24) / 22;
  return (
    <svg width={size} height={h} viewBox="0 0 22 24" style={{ flex: "none", display: "block" }}>
      <polygon points="11,1 20.5,6.5 20.5,17.5 11,23 1.5,17.5 1.5,6.5" fill={color} />
    </svg>
  );
}

export function ChevronLeft({ color = "#4A423A" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <polyline
        points="9.5,3 4.5,8 9.5,13"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronUp({ color = "#4A423A" }: { color?: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8">
      <polyline points="1.5,6 5,2 8.5,6" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDown({ color = "#4A423A" }: { color?: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8">
      <polyline points="1.5,2 5,6 8.5,2" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 14, color = "#4A423A" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <line x1="7" y1="1" x2="7" y2="13" stroke={color} strokeWidth="1.2" />
      <line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

export function XIcon({ size = 12, color = "#8E3D1E" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DragHandleIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" style={{ flex: "none" }}>
      <line x1="1" y1="4" x2="11" y2="4" stroke="#BDB2A1" strokeWidth="1.1" />
      <line x1="1" y1="8" x2="11" y2="8" stroke="#BDB2A1" strokeWidth="1.1" />
      <line x1="1" y1="12" x2="11" y2="12" stroke="#BDB2A1" strokeWidth="1.1" />
    </svg>
  );
}

export function NoteLinesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: "block" }}>
      <line x1="1" y1="4" x2="13" y2="4" stroke="#A79A8C" strokeWidth="1.1" />
      <line x1="1" y1="7.5" x2="13" y2="7.5" stroke="#A79A8C" strokeWidth="1.1" />
      <line x1="1" y1="11" x2="8.5" y2="11" stroke="#A79A8C" strokeWidth="1.1" />
    </svg>
  );
}

export function TabIcon({
  tab,
  color,
}: {
  tab: "hoje" | "produtos" | "rotinas" | "log" | "insights";
  color: string;
}) {
  if (tab === "hoje")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8.4" fill="none" stroke={color} strokeWidth="1.2" />
        <line x1="10" y1="10" x2="10" y2="5.6" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="10" y1="10" x2="13.2" y2="11.6" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  if (tab === "produtos")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="5.6" fill="none" stroke={color} strokeWidth="1.2" />
        <path d="M10 1.6 A8.4 8.4 0 0 1 18.4 10" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  if (tab === "rotinas")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line x1="3" y1="5" x2="17" y2="5" stroke={color} strokeWidth="1.2" />
        <line x1="3" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.2" />
        <line x1="3" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  if (tab === "log")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2.6" y="2.6" width="14.8" height="14.8" fill="none" stroke={color} strokeWidth="1.2" />
        <circle cx="10" cy="10" r="3.4" fill="none" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <line x1="4.5" y1="17" x2="4.5" y2="11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="17" x2="10" y2="4.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15.5" y1="17" x2="15.5" y2="8" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
