import type { FlightProvider } from "./types";

// This adapter runs in the browser. Authentication belongs to the server route.
export const sandboxFlightProvider: FlightProvider = {
  async search(criteria, { signal } = {}) {
    const response = await fetch("/api/flights/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(criteria),
      signal,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error ?? "Sandbox search failed. Please try again.",
      );
    return result.offers;
  },
};
