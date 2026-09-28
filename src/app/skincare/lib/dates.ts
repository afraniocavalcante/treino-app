export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISOStr + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

const WEEKDAY_LONG = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];
const MONTH_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function formatDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
}

export function formatDateMedium(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")} de ${MONTH_LONG[d.getMonth()]}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRelative(iso: string): string {
  const days = daysBetween(iso, todayISO());
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return MONTH_LONG[d.getMonth()];
}

export function daysInMonth(iso: string): string[] {
  const d = new Date(iso + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= count; day++) {
    out.push(toISODate(new Date(year, month, day)));
  }
  return out;
}
