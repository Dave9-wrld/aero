import type { FlightFilters, FlightOffer } from "./types.ts";

export function filterFlights(offers: FlightOffer[], filters: FlightFilters) {
  return offers
    .filter(
      (offer) =>
        (!filters.nonstop || offer.stops === 0) &&
        (!filters.airlines.length ||
          filters.airlines.includes(offer.airline.id)) &&
        (filters.maxPriceCents === null ||
          offer.priceCents <= filters.maxPriceCents),
    )
    .sort((a, b) => {
      if (filters.sort === "cheapest") return a.priceCents - b.priceCents;
      if (filters.sort === "fastest")
        return (
          a.durationMinutes - b.durationMinutes || a.priceCents - b.priceCents
        );
      return a.stops - b.stops || a.priceCents - b.priceCents;
    });
}
