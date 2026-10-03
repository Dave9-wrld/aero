import type { Airport } from "../features/flight-search/types.ts";

export const airports: Airport[] = [
  {
    code: "LOS",
    city: "Lagos",
    name: "Murtala Muhammed International",
    country: "Nigeria",
    timeZone: "Africa/Lagos",
  },
  {
    code: "ABV",
    city: "Abuja",
    name: "Nnamdi Azikiwe International",
    country: "Nigeria",
    timeZone: "Africa/Lagos",
  },
  {
    code: "PHC",
    city: "Port Harcourt",
    name: "Port Harcourt International",
    country: "Nigeria",
    timeZone: "Africa/Lagos",
  },
  {
    code: "LHR",
    city: "London",
    name: "Heathrow",
    country: "United Kingdom",
    timeZone: "Europe/London",
  },
  {
    code: "DXB",
    city: "Dubai",
    name: "Dubai International",
    country: "United Arab Emirates",
    timeZone: "Asia/Dubai",
  },
  {
    code: "JFK",
    city: "New York",
    name: "John F. Kennedy International",
    country: "United States",
    timeZone: "America/New_York",
  },
  {
    code: "ACC",
    city: "Accra",
    name: "Kotoka International",
    country: "Ghana",
    timeZone: "Africa/Accra",
  },
  {
    code: "CPT",
    city: "Cape Town",
    name: "Cape Town International",
    country: "South Africa",
    timeZone: "Africa/Johannesburg",
  },
  {
    code: "CDG",
    city: "Paris",
    name: "Charles de Gaulle",
    country: "France",
    timeZone: "Europe/Paris",
  },
];

export function getAirport(code: string) {
  return airports.find((airport) => airport.code === code);
}
