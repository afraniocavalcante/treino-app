"use client";

import type { ReactNode } from "react";

interface RingProps {
  size: number;
  r: number;
  stroke: number;
  fraction: number; // 0..1
  color: string;
  trackColor?: string;
  children?: ReactNode;
  className?: string;
  transition?: string;
}

export function Ring({
  size,
  r,
  stroke,
  fraction,
  color,
  trackColor = "#DED6C9",
  children,
  className,
  transition,
}: RingProps) {
  const c = size / 2;
  const dasharray = 2 * Math.PI * r;
  const dashoffset = dasharray * (1 - Math.max(0, Math.min(1, fraction)));
  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flex: "none" }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block", transform: "rotate(-90deg)" }}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dasharray}
          strokeDashoffset={dashoffset}
          style={{
            transition:
              transition ??
              "stroke-dashoffset 480ms cubic-bezier(.32,.72,.3,1), stroke 480ms ease",
          }}
        />
      </svg>
      {children != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function Flip({ value }: { value: string | number }) {
  return (
    <span key={String(value)} className="anim-flap">
      {value}
    </span>
  );
}
