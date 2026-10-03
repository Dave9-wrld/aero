import type { SearchCriteria } from "../flight-search/types.ts";

export type Airline = { id: string; name: string; mark: string; color: string };
export type FlightOffer = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  airline: Airline;
  flightNumber: string;
  // Integer cents. Sample offers are per adult; sandbox offers cover all adults.
  priceCents: number;
  currency: string;
  source?: "duffel-sandbox";
  priceBasis?: "all-travelers";
  operatingCarriers?: string[];
  expiresAt?: string;
};

// Both the sample and sandbox adapters implement this contract.
export interface FlightProvider {
  search(
    criteria: SearchCriteria,
    options?: { signal?: AbortSignal },
  ): Promise<FlightOffer[]>;
}

export type FlightFilters = {
  nonstop: boolean;
  airlines: string[];
  maxPriceCents: number | null;
  sort: "recommended" | "cheapest" | "fastest";
};
