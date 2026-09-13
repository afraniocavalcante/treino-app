"use client";

/**
 * Solid geometric pictogram set for the "Incheon × Niemeyer" redesign —
 * replaces emoji throughout the app. Each icon takes a pixel size and a
 * `currentColor`-driven color (pass via the `color` style prop on a wrapper,
 * or the `color` prop here).
 */

interface IconProps {
  size?: number;
  color?: string;
}

function svg(size: number, color: string | undefined, children: React.ReactNode, viewBox = "0 0 24 24") {
  return (
    <svg viewBox={viewBox} width={size} height={size} style={{ flexShrink: 0 }} fill={color ?? "currentColor"}>
      {children}
    </svg>
  );
}

export function HomeIcon({ size = 18, color }: IconProps) {
  return svg(size, color, <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />);
}

export function PlateIcon({ size = 18, color }: IconProps) {
  return svg(
    size,
    color,
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
  );
}

export function DumbbellIcon({ size = 18, color }: IconProps) {
  return svg(
    size,
    color,
    <>
      <rect x="1" y="9" width="3" height="6" rx="1" />
      <rect x="20" y="9" width="3" height="6" rx="1" />
      <rect x="4" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="7" width="3" height="10" rx="1" />
      <rect x="7" y="11" width="10" height="2" />
    </>
  );
}

export function BarChartIcon({ size = 18, color }: IconProps) {
  return svg(
    size,
    color,
    <>
      <rect x="3" y="13" width="4" height="8" />
      <rect x="10" y="8" width="4" height="13" />
      <rect x="17" y="3" width="4" height="18" />
    </>
  );
}

export function SlidersIcon({ size = 18, color }: IconProps) {
  return svg(
    size,
    color,
    <>
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <circle cx="15" cy="6" r="3" />
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <circle cx="8" cy="12" r="3" />
      <rect x="3" y="17" width="18" height="2" rx="1" />
      <circle cx="17" cy="18" r="3" />
    </>
  );
}

export function WarningIcon({ size = 13, color, markColor = "#F5EFE3" }: IconProps & { markColor?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0 }}>
      <path d="M12 3 22 20H2Z" fill={color ?? "currentColor"} />
      <rect x="11" y="9" width="2" height="6" fill={markColor} />
      <rect x="11" y="16.5" width="2" height="2" fill={markColor} />
    </svg>
  );
}

export function ChevronDownIcon({ size = 12, color, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color ?? "currentColor"}
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s ease" }}
    >
      <path d="M5 8l7 8 7-8Z" />
    </svg>
  );
}

export function CheckIcon({ size = 10, color = "#F5EFE3" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function SupplementIcon({ size = 16, color, markColor }: IconProps & { markColor?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0 }} fill={color ?? "currentColor"}>
      <rect x="2" y="9" width="20" height="6" rx="3" />
      <rect x="11" y="9" width="2" height="6" fill={markColor ?? "#F5EFE3"} />
    </svg>
  );
}

export function PlayIcon({ size = 15, color }: IconProps) {
  return svg(size, color, <path d="M8 5v14l11-7Z" />);
}

export function RefreshIcon({ size = 14, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v6h6M20 20v-6h-6M5 15a8 8 0 0014-4M19 9A8 8 0 005 13" />
    </svg>
  );
}

export function PlusIcon({ size = 12, color }: IconProps) {
  return svg(
    size,
    color,
    <>
      <rect x="10.5" y="3" width="3" height="18" />
      <rect x="3" y="10.5" width="18" height="3" />
    </>
  );
}

export function SignOutIcon({ size = 14, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h4v16h-4M10 12h10M13 8l4 4-4 4" />
    </svg>
  );
}

export function FlagTriangleIcon({ size = 11, color }: IconProps) {
  return svg(size, color, <path d="M12 3 21 20H3Z" />);
}

export function DiamondIcon({ size = 10, color }: IconProps) {
  return svg(size, color, <rect x="4" y="4" width="16" height="16" rx="2" transform="rotate(45 12 12)" />);
}
