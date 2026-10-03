import { getAirport } from "../../data/airports.ts";
import { todayISO, dateAfter } from "../../lib/format.ts";
import type { SearchCriteria } from "./types.ts";

export type SearchErrors = Partial<Record<keyof SearchCriteria, string>>;

export function validateSearch(
  criteria: SearchCriteria,
  today = todayISO(),
): SearchErrors {
  const errors: SearchErrors = {};
  if (!getAirport(criteria.origin))
    errors.origin = "Choose a departure airport.";
  if (!getAirport(criteria.destination))
    errors.destination = "Choose a destination airport.";
  if (criteria.origin && criteria.origin === criteria.destination) {
    errors.destination = "Choose a different destination.";
  }
  const parsed = new Date(`${criteria.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(criteria.date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== criteria.date
  ) {
    errors.date = "Choose a valid departure date.";
  } else if (criteria.date < today) {
    errors.date = "Choose today or a future date.";
  }
  if (
    !Number.isInteger(criteria.passengers) ||
    criteria.passengers < 1 ||
    criteria.passengers > 4
  ) {
    errors.passengers = "Choose between 1 and 4 adults.";
  }
  return errors;
}

export function defaultSearch(): SearchCriteria {
  return {
    origin: "LOS",
    destination: "LHR",
    date: dateAfter(14),
    passengers: 1,
  };
}

export function searchToParams(criteria: SearchCriteria) {
  return new URLSearchParams({
    from: criteria.origin,
    to: criteria.destination,
    date: criteria.date,
    passengers: String(criteria.passengers),
  });
}

export function searchFromParams(
  params: Pick<URLSearchParams, "get">,
): SearchCriteria {
  return {
    origin: params.get("from") ?? "",
    destination: params.get("to") ?? "",
    date: params.get("date") ?? "",
    passengers: Number(params.get("passengers") ?? "1"),
  };
}
