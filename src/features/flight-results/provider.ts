import type { SearchCriteria } from "../flight-search/types.ts";
import { validateSearch } from "../flight-search/model.ts";
import type { Airline, FlightOffer, FlightProvider } from "./types.ts";

export const airlines: Airline[] = [
  { id: "northstar", name: "Northstar Airways", mark: "N", color: "#174e47" },
  { id: "solstice", name: "Solstice Air", mark: "S", color: "#b96738" },
  { id: "meridian", name: "Meridian Airlines", mark: "M", color: "#69719b" },
  { id: "airwave", name: "Airwave", mark: "A", color: "#478896" },
];

const routes: Record<string, [number, number]> = {
  "LOS-LHR": [390, 82000000],
  "LOS-DXB": [460, 71000000],
  "LOS-JFK": [660, 124000000],
  "LOS-CPT": [365, 62000000],
  "LOS-ACC": [60, 18500000],
  "LOS-CDG": [390, 79000000],
  "ABV-LHR": [410, 86000000],
  "ABV-DXB": [440, 74000000],
  "ABV-LOS": [70, 12500000],
  "PHC-LOS": [65, 11500000],
  "PHC-ABV": [65, 12000000],
  "LHR-DXB": [430, 98000000],
  "LHR-JFK": [480, 112000000],
  "LHR-CDG": [80, 22000000],
};

export function createDemoOffers(criteria: SearchCriteria): FlightOffer[] {
  const route =
    routes[`${criteria.origin}-${criteria.destination}`] ??
    routes[`${criteria.destination}-${criteria.origin}`];
  if (!route) return [];
  const [baseDuration, basePrice] = route;
  return Array.from({ length: 6 }, (_, index) => {
    const stops = baseDuration > 120 && (index === 1 || index === 4) ? 1 : 0;
    const durationMinutes = baseDuration + (stops ? 150 : index * 5);
    const departure = new Date(
      `${criteria.date}T${["06", "09", "12", "14", "16", "17"][index]}:00:00Z`,
    );
    return {
      id: `${criteria.origin}-${criteria.destination}-${criteria.date}-${index}`,
      origin: criteria.origin,
      destination: criteria.destination,
      departureAt: departure.toISOString(),
      arrivalAt: new Date(
        departure.getTime() + durationMinutes * 60000,
      ).toISOString(),
      durationMinutes,
      stops,
      airline: airlines[index % airlines.length],
      flightNumber: `${["NS", "SL", "MD", "AW"][index % 4]} ${410 + index * 17}`,
      priceCents: Math.round(
        basePrice * [1, 0.81, 1.12, 1.04, 0.86, 1.18][index],
      ),
      currency: "NGN",
    };
  });
}

export const flightProvider: FlightProvider = {
  async search(criteria, { signal } = {}) {
    if (Object.keys(validateSearch(criteria)).length)
      throw new Error("Please check your search details.");
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted)
        return reject(new DOMException("Search cancelled", "AbortError"));
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Search cancelled", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, 550);
      signal?.addEventListener("abort", abort, { once: true });
    });
    return createDemoOffers(criteria);
  },
};
