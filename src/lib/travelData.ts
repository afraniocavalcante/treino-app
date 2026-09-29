import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CHECKLIST, type ChecklistItem, type Flight, type Trip, type TripDetail } from "./travel";

const FLIGHT_COLUMNS =
  "id, trip_id, carrier, flight_number, origin_iata, origin_city, origin_terminal, dest_iata, dest_city, dest_terminal, departure_at, arrival_at, pnr, seat, boarding_group, gate, bags_cabin_kg, bags_checked_kg, checkin_opens_at, checkin_done, sort_order";

function mapFlight(row: Record<string, unknown>): Flight {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    carrier: row.carrier as string,
    flightNumber: row.flight_number as string,
    originIata: row.origin_iata as string,
    originCity: row.origin_city as string,
    originTerminal: (row.origin_terminal as string | null) ?? null,
    destIata: row.dest_iata as string,
    destCity: row.dest_city as string,
    destTerminal: (row.dest_terminal as string | null) ?? null,
    departureAt: row.departure_at as string,
    arrivalAt: row.arrival_at as string,
    pnr: (row.pnr as string | null) ?? null,
    seat: (row.seat as string | null) ?? null,
    boardingGroup: (row.boarding_group as string | null) ?? null,
    gate: (row.gate as string | null) ?? null,
    bagsCabinKg: row.bags_cabin_kg == null ? null : Number(row.bags_cabin_kg),
    bagsCheckedKg: row.bags_checked_kg == null ? null : Number(row.bags_checked_kg),
    checkinOpensAt: (row.checkin_opens_at as string | null) ?? null,
    checkinDone: !!row.checkin_done,
    sortOrder: row.sort_order as number,
  };
}

function mapChecklistItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    flightId: (row.flight_id as string | null) ?? null,
    text: row.text as string,
    moment: row.moment as ChecklistItem["moment"],
    done: !!row.done,
    sortOrder: row.sort_order as number,
  };
}

function mapTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    city: row.city as string,
    name: row.name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    malaFeita: !!row.mala_feita,
  };
}

const TRIP_COLUMNS = "id, city, name, start_date, end_date, mala_feita";

export async function getTrips(supabase: SupabaseClient): Promise<Trip[]> {
  const { data, error } = await supabase.from("trips").select(TRIP_COLUMNS).order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTrip);
}

export async function setMalaFeita(supabase: SupabaseClient, tripId: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("trips").update({ mala_feita: done }).eq("id", tripId);
  if (error) throw error;
}

export async function getAllFlights(supabase: SupabaseClient): Promise<Flight[]> {
  const { data, error } = await supabase.from("flights").select(FLIGHT_COLUMNS).order("departure_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapFlight);
}

export async function getTripDetail(supabase: SupabaseClient, tripId: string): Promise<TripDetail | null> {
  const [tripRes, flightsRes, checklistRes] = await Promise.all([
    supabase.from("trips").select(TRIP_COLUMNS).eq("id", tripId).maybeSingle(),
    supabase.from("flights").select(FLIGHT_COLUMNS).eq("trip_id", tripId).order("sort_order", { ascending: true }),
    supabase.from("checklist_items").select("id, trip_id, flight_id, text, moment, done, sort_order").eq("trip_id", tripId).order("sort_order", { ascending: true }),
  ]);
  if (tripRes.error) throw tripRes.error;
  if (!tripRes.data) return null;
  if (flightsRes.error) throw flightsRes.error;
  if (checklistRes.error) throw checklistRes.error;

  return {
    ...mapTrip(tripRes.data),
    flights: (flightsRes.data ?? []).map(mapFlight),
    checklist: (checklistRes.data ?? []).map(mapChecklistItem),
  };
}

export interface NewFlightInput {
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
}

/** Cria uma viagem com o primeiro voo e já semeia o checklist padrão de 9 itens (editável depois). */
export async function createTrip(
  supabase: SupabaseClient,
  trip: { city: string; name: string; startDate: string; endDate: string },
  flight: NewFlightInput
): Promise<string> {
  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .insert({ city: trip.city, name: trip.name, start_date: trip.startDate, end_date: trip.endDate })
    .select("id")
    .single();
  if (tripErr) throw tripErr;
  const tripId = tripRow.id as string;

  const { error: flightErr } = await supabase.from("flights").insert({
    trip_id: tripId,
    carrier: flight.carrier,
    flight_number: flight.flightNumber,
    origin_iata: flight.originIata,
    origin_city: flight.originCity,
    origin_terminal: flight.originTerminal,
    dest_iata: flight.destIata,
    dest_city: flight.destCity,
    dest_terminal: flight.destTerminal,
    departure_at: flight.departureAt,
    arrival_at: flight.arrivalAt,
    pnr: flight.pnr,
    seat: flight.seat,
    boarding_group: flight.boardingGroup,
    gate: flight.gate,
    bags_cabin_kg: flight.bagsCabinKg,
    bags_checked_kg: flight.bagsCheckedKg,
    checkin_opens_at: flight.checkinOpensAt,
    sort_order: 0,
  });
  if (flightErr) throw flightErr;

  const { error: checklistErr } = await supabase.from("checklist_items").insert(
    DEFAULT_CHECKLIST.map((item, i) => ({ trip_id: tripId, text: item.text, moment: item.moment, sort_order: i }))
  );
  if (checklistErr) throw checklistErr;

  return tripId;
}

export async function updateTrip(supabase: SupabaseClient, id: string, updates: { city: string; name: string; startDate: string; endDate: string }): Promise<void> {
  const { error } = await supabase.from("trips").update({ city: updates.city, name: updates.name, start_date: updates.startDate, end_date: updates.endDate }).eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

export async function addFlight(supabase: SupabaseClient, tripId: string, flight: NewFlightInput, sortOrder: number): Promise<void> {
  const { error } = await supabase.from("flights").insert({
    trip_id: tripId,
    carrier: flight.carrier,
    flight_number: flight.flightNumber,
    origin_iata: flight.originIata,
    origin_city: flight.originCity,
    origin_terminal: flight.originTerminal,
    dest_iata: flight.destIata,
    dest_city: flight.destCity,
    dest_terminal: flight.destTerminal,
    departure_at: flight.departureAt,
    arrival_at: flight.arrivalAt,
    pnr: flight.pnr,
    seat: flight.seat,
    boarding_group: flight.boardingGroup,
    gate: flight.gate,
    bags_cabin_kg: flight.bagsCabinKg,
    bags_checked_kg: flight.bagsCheckedKg,
    checkin_opens_at: flight.checkinOpensAt,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function updateFlight(supabase: SupabaseClient, id: string, updates: Partial<NewFlightInput & { checkinDone: boolean }>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.carrier !== undefined) payload.carrier = updates.carrier;
  if (updates.flightNumber !== undefined) payload.flight_number = updates.flightNumber;
  if (updates.originIata !== undefined) payload.origin_iata = updates.originIata;
  if (updates.originCity !== undefined) payload.origin_city = updates.originCity;
  if (updates.originTerminal !== undefined) payload.origin_terminal = updates.originTerminal;
  if (updates.destIata !== undefined) payload.dest_iata = updates.destIata;
  if (updates.destCity !== undefined) payload.dest_city = updates.destCity;
  if (updates.destTerminal !== undefined) payload.dest_terminal = updates.destTerminal;
  if (updates.departureAt !== undefined) payload.departure_at = updates.departureAt;
  if (updates.arrivalAt !== undefined) payload.arrival_at = updates.arrivalAt;
  if (updates.pnr !== undefined) payload.pnr = updates.pnr;
  if (updates.seat !== undefined) payload.seat = updates.seat;
  if (updates.boardingGroup !== undefined) payload.boarding_group = updates.boardingGroup;
  if (updates.gate !== undefined) payload.gate = updates.gate;
  if (updates.bagsCabinKg !== undefined) payload.bags_cabin_kg = updates.bagsCabinKg;
  if (updates.bagsCheckedKg !== undefined) payload.bags_checked_kg = updates.bagsCheckedKg;
  if (updates.checkinOpensAt !== undefined) payload.checkin_opens_at = updates.checkinOpensAt;
  if (updates.checkinDone !== undefined) payload.checkin_done = updates.checkinDone;

  const { error } = await supabase.from("flights").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteFlight(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("flights").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleChecklistItem(supabase: SupabaseClient, id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("checklist_items").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function addChecklistItem(supabase: SupabaseClient, tripId: string, text: string, moment: ChecklistItem["moment"], sortOrder: number): Promise<void> {
  const { error } = await supabase.from("checklist_items").insert({ trip_id: tripId, text, moment, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteChecklistItem(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
}
