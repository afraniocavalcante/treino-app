export interface Trip {
  id: string;
  city: string;
  name: string;
  startDate: string;
  endDate: string;
  /** Tarefa única por viagem ("fiz a mala"), não diária — ver shouldPackFor. */
  malaFeita: boolean;
}

export interface Flight {
  id: string;
  tripId: string;
  carrier: string;
  flightNumber: string;
  originIata: string;
  originCity: string;
  originTerminal: string | null;
  destIata: string;
  destCity: string;
  destTerminal: string | null;
  departureAt: string;
  arrivalAt: string;
  pnr: string | null;
  seat: string | null;
  boardingGroup: string | null;
  gate: string | null;
  bagsCabinKg: number | null;
  bagsCheckedKg: number | null;
  checkinOpensAt: string | null;
  checkinDone: boolean;
  sortOrder: number;
}

export type ChecklistMoment = "dias-antes" | "vespera" | "dia";

export interface ChecklistItem {
  id: string;
  tripId: string;
  flightId: string | null;
  text: string;
  moment: ChecklistMoment;
  done: boolean;
  sortOrder: number;
}

export interface TripDetail extends Trip {
  flights: Flight[];
  checklist: ChecklistItem[];
}

export const MOMENT_LABELS: Record<ChecklistMoment, string> = {
  "dias-antes": "Dias antes",
  vespera: "Véspera",
  dia: "Dia do voo",
};

export const DEFAULT_CHECKLIST: { text: string; moment: ChecklistMoment }[] = [
  { text: "Passaporte válido por 6 meses", moment: "dias-antes" },
  { text: "Seguro viagem contratado", moment: "dias-antes" },
  { text: "Adaptador de tomada e eSIM", moment: "dias-antes" },
  { text: "Check-in feito e assento escolhido", moment: "vespera" },
  { text: "Mala dentro do limite de peso", moment: "vespera" },
  { text: "Líquidos em frascos até 100 ml", moment: "vespera" },
  { text: "Documento e cartão de embarque à mão", moment: "dia" },
  { text: "Celular carregado", moment: "dia" },
  { text: "Sair de casa no horário sugerido", moment: "dia" },
];

export const PHASE_LABELS = ["Expectativa", "Preparação", "Check-in aberto", "Dia do voo", "Embarque", "Em voo", "Pousou"] as const;

export interface FlightFact {
  k: string;
  v: string;
  note?: string;
}

export interface FlightCardState {
  phase: number; // 0-6, index into PHASE_LABELS
  kicker: string;
  big: string;
  unit: string;
  headline: string;
  sub: string;
  status: string;
  statusVariant: "neutral" | "accent" | "accent-2";
  facts: FlightFact[];
  primary: { label: string; action: "checklist" | "checkin" | "boardingpass" | "viewtrip" } | null;
  pulse: boolean;
  routePct: number; // 0-100, only meaningful in phase 5
  /** null once the flight's landed window (3h after arrival) has passed — caller should move on to the next flight/trip. */
  active: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" });
}

function formatHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const LANDED_WINDOW = 3 * HOUR;

/** Deriva o estado do card a partir só de data/hora — sem API de status ao vivo (decisão do usuário). */
export function deriveFlightState(flight: Flight, now: Date): FlightCardState {
  const dep = new Date(flight.departureAt);
  const arr = new Date(flight.arrivalAt);
  const checkinOpensAt = flight.checkinOpensAt ? new Date(flight.checkinOpensAt) : new Date(dep.getTime() - DAY);
  const daysToDep = Math.ceil((dep.getTime() - now.getTime()) / DAY);

  const baseFacts: FlightFact[] = [
    { k: "Partida", v: formatHM(dep), note: formatDayMonth(dep) },
    { k: "Chegada", v: formatHM(arr), note: formatDayMonth(arr) },
    { k: "Bagagem", v: flight.bagsCheckedKg ? `${flight.bagsCabinKg ?? 0}+${flight.bagsCheckedKg}kg` : `${flight.bagsCabinKg ?? 0}kg mão` },
  ];

  if (now.getTime() > arr.getTime() + LANDED_WINDOW) {
    return {
      phase: 6, kicker: "Pousou", big: flight.destIata, unit: formatHM(arr), headline: `Chegou em ${flight.destCity}.`,
      sub: "", status: "Pousou", statusVariant: "accent", facts: baseFacts, primary: { label: "Ver viagem", action: "viewtrip" },
      pulse: false, routePct: 100, active: false,
    };
  }
  if (now.getTime() > arr.getTime()) {
    return {
      phase: 6, kicker: `Pousou em ${flight.destCity} às`, big: formatHM(arr), unit: "",
      headline: `Bem-vindo a ${flight.destCity}.`, sub: "", status: "Pousou", statusVariant: "accent",
      facts: baseFacts, primary: { label: "Ver viagem", action: "viewtrip" }, pulse: false, routePct: 100, active: true,
    };
  }
  if (now.getTime() >= dep.getTime()) {
    const total = arr.getTime() - dep.getTime();
    const elapsed = now.getTime() - dep.getTime();
    const remainMs = Math.max(0, arr.getTime() - now.getTime());
    const remainH = Math.floor(remainMs / HOUR);
    const remainM = Math.floor((remainMs % HOUR) / 60000);
    return {
      phase: 5, kicker: "Em voo · pouso em", big: remainH > 0 ? `${remainH}h${pad(remainM)}` : `${remainM}`, unit: remainH > 0 ? "" : "min",
      headline: "Em voo.", sub: `Chegada às ${formatHM(arr)}, hora local.`, status: "Em voo", statusVariant: "accent",
      facts: baseFacts, primary: null, pulse: false, routePct: Math.min(100, Math.round((elapsed / total) * 100)), active: true,
    };
  }
  if (now.getTime() >= dep.getTime() - 2 * HOUR) {
    const gate = flight.gate || "—";
    return {
      phase: 4, kicker: `Portão · embarque às ${formatHM(new Date(dep.getTime() - 35 * 60000))}`, big: gate, unit: flight.boardingGroup ? `grupo ${flight.boardingGroup}` : "",
      headline: "Embarque em breve.", sub: `Terminal ${flight.originTerminal ?? "—"}.`, status: "No horário", statusVariant: "neutral",
      facts: [{ k: "Portão", v: gate }, { k: "Grupo", v: flight.boardingGroup ?? "—" }, { k: "Assento", v: flight.seat ?? "—" }],
      primary: { label: "Cartão de embarque", action: "boardingpass" }, pulse: false, routePct: 0, active: true,
    };
  }
  if (isSameLocalDay(now, dep)) {
    return {
      phase: 3, kicker: "Hoje · partida às", big: formatHM(dep), unit: "",
      headline: "Hoje é o dia do voo.", sub: `Terminal ${flight.originTerminal ?? "—"}.`, status: "No horário", statusVariant: "neutral",
      facts: [{ k: "Terminal", v: flight.originTerminal ?? "—" }, { k: "Portão", v: flight.gate ?? "a definir" }, { k: "Assento", v: flight.seat ?? "—" }],
      primary: { label: "Cartão de embarque", action: "boardingpass" }, pulse: false, routePct: 0, active: true,
    };
  }
  const checkinOpen = now.getTime() >= checkinOpensAt.getTime();
  const hoursToDep = Math.ceil((dep.getTime() - now.getTime()) / HOUR);
  const remainBig = daysToDep >= 1 ? `${daysToDep}` : `${Math.max(0, hoursToDep)}`;
  const remainUnit = daysToDep >= 1 ? "dias" : "horas";
  if (checkinOpen && !flight.checkinDone) {
    return {
      phase: 2, kicker: "Check-in aberto · partida em", big: remainBig, unit: remainUnit,
      headline: "O check-in abriu.", sub: "Copia o localizador e leva pro site da companhia.", status: "Check-in aberto", statusVariant: "accent",
      facts: [{ k: "Localizador", v: flight.pnr ?? "—" }, { k: "Assento", v: flight.seat ?? "a escolher" }, { k: "Bagagem", v: baseFacts[2].v }],
      primary: { label: "Fazer check-in", action: "checkin" }, pulse: true, routePct: 0, active: true,
    };
  }
  if (checkinOpen && flight.checkinDone) {
    return {
      phase: 2, kicker: "Check-in feito · partida em", big: remainBig, unit: remainUnit,
      headline: `Check-in feito${flight.seat ? `. Assento ${flight.seat}.` : "."}`, sub: "Confira os dados do voo quando quiser.",
      status: "Check-in feito", statusVariant: "accent", facts: [{ k: "Assento", v: flight.seat ?? "—" }, { k: "Grupo", v: flight.boardingGroup ?? "—" }, { k: "Bagagem", v: baseFacts[2].v }],
      primary: { label: "Cartão de embarque", action: "boardingpass" }, pulse: false, routePct: 0, active: true,
    };
  }
  if (daysToDep <= 7) {
    return {
      phase: 1, kicker: "Faltam", big: `${Math.max(0, daysToDep)}`, unit: "dias",
      headline: `${flight.destCity} está chegando.`, sub: "Hora de separar os documentos.", status: "No horário", statusVariant: "neutral",
      facts: baseFacts, primary: { label: "Continuar checklist", action: "checklist" }, pulse: false, routePct: 0, active: true,
    };
  }
  return {
    phase: 0, kicker: "Faltam", big: `${daysToDep}`, unit: "dias",
    headline: `${flight.destCity} já está no horizonte.`, sub: "", status: "No horário", statusVariant: "neutral",
    facts: baseFacts, primary: { label: "Abrir checklist", action: "checklist" }, pulse: false, routePct: 0, active: true,
  };
}

export function tripDaysAway(trip: Trip, now: Date): number {
  return Math.max(0, Math.ceil((new Date(trip.startDate).getTime() - now.getTime()) / DAY));
}

const PACK_REMINDER_DAYS = 3;

/** A data/hora do voo mais próximo (o primeiro a decolar) de uma viagem — é
 * contra isso, não contra trip.startDate, que o aviso de mala é calculado
 * (uma viagem sem voo cadastrado ainda não tem o que avisar). */
function earliestDepartureFor(trip: Trip, flights: Flight[]): Date | null {
  const tripFlights = flights.filter((f) => f.tripId === trip.id);
  if (tripFlights.length === 0) return null;
  const earliest = tripFlights.reduce((min, f) => (new Date(f.departureAt) < new Date(min.departureAt) ? f : min));
  return new Date(earliest.departureAt);
}

/** Tarefa única por viagem, não diária: aparece a partir de 3 dias antes do
 * voo mais próximo e persiste (não some sozinha) até ser marcada feita ou o
 * voo já ter partido. */
export function shouldPackFor(trip: Trip, flights: Flight[], now: Date): boolean {
  if (trip.malaFeita) return false;
  const departure = earliestDepartureFor(trip, flights);
  if (!departure) return false;
  if (departure.getTime() <= now.getTime()) return false;
  const daysUntil = (departure.getTime() - now.getTime()) / DAY;
  return daysUntil <= PACK_REMINDER_DAYS;
}

/** A viagem mais próxima que ainda precisa do aviso de mala, se houver. */
export function nextTripNeedingPack(trips: Trip[], flights: Flight[], now: Date): Trip | null {
  const candidates = trips
    .filter((t) => shouldPackFor(t, flights, now))
    .map((t) => ({ trip: t, departure: earliestDepartureFor(t, flights)! }))
    .sort((a, b) => a.departure.getTime() - b.departure.getTime());
  return candidates[0]?.trip ?? null;
}

/** O voo que a Home do app Viagens (e a tela Hoje) mostram: o mais próximo cujo estado ainda está "ativo". */
export function pickActiveFlight(flights: Flight[], now: Date): { flight: Flight; state: FlightCardState } | null {
  const withState = flights
    .map((f) => ({ flight: f, state: deriveFlightState(f, now) }))
    .filter((x) => x.state.active);
  withState.sort((a, b) => new Date(a.flight.departureAt).getTime() - new Date(b.flight.departureAt).getTime());
  return withState[0] ?? null;
}
