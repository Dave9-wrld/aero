import { validateSearch } from "@/features/flight-search/model";
import type { SearchCriteria } from "@/features/flight-search/types";
import {
  FlightSearchError,
  searchDuffel,
} from "@/features/flight-results/duffel.server";

import { readDemoRequest, demoApiError } from "@/lib/api-guard.server";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let criteria: SearchCriteria;
  try {
    const body = (await readDemoRequest(request)) as Record<string, unknown>;
    if (
      !body ||
      typeof body !== "object" ||
      typeof body.origin !== "string" ||
      typeof body.destination !== "string" ||
      typeof body.date !== "string" ||
      typeof body.passengers !== "number"
    )
      return Response.json(
        {
          error:
            "Please provide airports, a departure date and an adult count.",
        },
        { status: 400, headers },
      );
    criteria = {
      origin: body.origin,
      destination: body.destination,
      date: body.date,
      passengers: body.passengers,
    };
    const errors = validateSearch(criteria);
    if (Object.keys(errors).length)
      return Response.json(
        { error: Object.values(errors).join(" ") },
        { status: 400, headers },
      );
  } catch (error) {
    if (error instanceof FlightSearchError) return demoApiError(error);
    return Response.json(
      { error: "The search request must contain valid JSON." },
      { status: 400, headers },
    );
  }
  try {
    const offers = await searchDuffel(criteria, request.signal);
    return Response.json({ offers, source: "duffel-sandbox" }, { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof FlightSearchError
            ? error.message
            : "The sandbox search could not be completed. Please try again.",
      },
      {
        status: error instanceof FlightSearchError ? error.status : 502,
        headers,
      },
    );
  }
}
