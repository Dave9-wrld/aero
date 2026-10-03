import "server-only";
import type { SearchCriteria } from "../flight-search/types";
import type { FlightOffer } from "./types";
import type {
  OfferSeatMap,
  SandboxOfferDetails,
  SeatElement,
} from "../sandbox-offer/types";

export class FlightSearchError extends Error {
  constructor(
    message: string,
    public status = 502,
    public providerCodes: string[] = [],
  ) {
    super(message);
  }
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new FlightSearchError(
      "Duffel returned an unexpected response. Please search again.",
    );
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value.length)
    throw new FlightSearchError(
      "Duffel returned incomplete flight details. Please search again.",
    );
  return value;
}
function durationMinutes(value: unknown) {
  const match = text(value).match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
  );
  if (!match)
    throw new FlightSearchError(
      "Duffel returned an unsupported flight duration.",
    );
  const minutes =
    Number(match[1] ?? 0) * 1440 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0) +
    Number(match[4] ?? 0) / 60;
  if (minutes <= 0)
    throw new FlightSearchError("Duffel returned an invalid flight duration.");
  return Math.round(minutes);
}
function localTimestamp(value: unknown) {
  const timestamp = text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timestamp) ||
    !Number.isFinite(Date.parse(`${timestamp}Z`))
  )
    throw new FlightSearchError("Duffel returned an invalid flight time.");
  return timestamp;
}
export function amountInCents(value: unknown, allowZero = false) {
  const amount = text(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount))
    throw new FlightSearchError("Duffel returned an unsupported price format.");
  const [whole, fraction = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0 || (!allowZero && cents === 0))
    throw new FlightSearchError("Duffel returned an invalid price.");
  return cents;
}

// The external schema stops here. The UI receives only Aero's display model.
function normalizeOffer(value: unknown, criteria: SearchCriteria): FlightOffer {
  const offer = record(value);
  if (offer.live_mode !== false)
    throw new FlightSearchError("Only Duffel test offers are supported.");
  const slices = offer.slices;
  if (!Array.isArray(slices) || slices.length !== 1)
    throw new FlightSearchError("This search supports one-way offers only.");
  const slice = record(slices[0]);
  if (!Array.isArray(slice.segments) || !slice.segments.length)
    throw new FlightSearchError("Duffel returned an empty itinerary.");
  const segments = slice.segments.map(record);
  const first = segments[0],
    last = segments[segments.length - 1];
  if (
    record(first.origin).iata_code !== criteria.origin ||
    record(last.destination).iata_code !== criteria.destination
  )
    throw new FlightSearchError(
      "Duffel returned a route that does not match the search.",
    );
  const currency = text(offer.total_currency);
  if (
    !/^[A-Z]{3}$/.test(currency) ||
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits !== 2
  )
    throw new FlightSearchError(
      "This version supports currencies with two decimal places only.",
    );
  const owner = record(offer.owner);
  const name = text(owner.name);
  const expiresAt = text(offer.expires_at);
  if (!Number.isFinite(Date.parse(expiresAt)))
    throw new FlightSearchError("Duffel returned an invalid offer expiry.");
  const technicalStops = segments.reduce(
    (sum, segment) =>
      sum + (Array.isArray(segment.stops) ? segment.stops.length : 0),
    0,
  );
  return {
    id: text(offer.id),
    origin: criteria.origin,
    destination: criteria.destination,
    departureAt: localTimestamp(first.departing_at),
    arrivalAt: localTimestamp(last.arriving_at),
    durationMinutes: durationMinutes(slice.duration),
    stops: segments.length - 1 + technicalStops,
    airline: {
      id: text(owner.id),
      name,
      mark:
        typeof owner.iata_code === "string"
          ? owner.iata_code
          : name.slice(0, 2),
      color: "#174e47",
    },
    flightNumber: segments
      .map((segment) => {
        const carrier = record(segment.operating_carrier);
        return `${typeof carrier.iata_code === "string" ? carrier.iata_code : ""} ${text(segment.operating_carrier_flight_number)}`.trim();
      })
      .join(" / "),
    priceCents: amountInCents(offer.total_amount),
    currency,
    source: "duffel-sandbox",
    priceBasis: "all-travelers",
    expiresAt,
    operatingCarriers: [
      ...new Set(
        segments.map((segment) => text(record(segment.operating_carrier).name)),
      ),
    ],
  };
}

export async function requestDuffel(
  path: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<unknown> {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
  if (!token)
    throw new FlightSearchError(
      "Duffel sandbox is not connected yet. Use Sample flights while the test token is being configured.",
      503,
    );
  if (!token.startsWith("duffel_test_"))
    throw new FlightSearchError(
      "A Duffel test token is required. Live tokens are disabled in Aero.",
      503,
    );
  let response: Response;
  try {
    response = await fetch(`https://api.duffel.com/air/${path}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(path === "orders" ? 60000 : 15000),
      ]),
    });
  } catch {
    if (signal.aborted) throw new FlightSearchError("Search cancelled.", 499);
    throw new FlightSearchError(
      "Duffel did not respond in time. Please try again.",
      504,
    );
  }
  // Do not expose the provider's raw errors, request payloads or credentials.
  if (!response.ok) {
    if (path === "orders") {
      const payload = await response.json().catch(() => null);
      const codes: string[] = Array.isArray(payload?.errors)
        ? payload.errors.flatMap((error: { code?: unknown }) =>
            typeof error.code === "string" && /^[a-z_]{1,80}$/.test(error.code)
              ? [error.code]
              : [],
          )
        : [];
      throw new FlightSearchError(
        response.status === 401 || response.status === 403
          ? "Duffel rejected order creation. Check that your test token has permission to create flight orders."
          : "Duffel declined this test booking. Search again and choose Duffel Airways, or check the Developer test dashboard.",
        502,
        codes,
      );
    }
    if (response.status === 404 || response.status === 410)
      throw new FlightSearchError(
        "This offer is no longer available. Return to flights and search again.",
        410,
      );
    if (response.status === 401 || response.status === 403)
      throw new FlightSearchError(
        "Duffel rejected the test token. Check its validity and flight-search permissions.",
        502,
      );
    if (response.status === 429)
      throw new FlightSearchError(
        "The sandbox request limit was reached. Wait a moment before trying again.",
        429,
      );
    throw new FlightSearchError(
      "Duffel could not complete this search. Try a different date or try again.",
    );
  }
  const payload = record(await response.json());
  return payload.data;
}

export async function searchDuffel(
  criteria: SearchCriteria,
  signal: AbortSignal,
): Promise<FlightOffer[]> {
  const data = record(
    await requestDuffel(
      "offer_requests?return_offers=true&supplier_timeout=10000",
      signal,
      {
        data: {
          slices: [
            {
              origin: criteria.origin,
              destination: criteria.destination,
              departure_date: criteria.date,
            },
          ],
          passengers: Array.from({ length: criteria.passengers }, () => ({
            type: "adult",
          })),
          cabin_class: "economy",
          max_connections: 1,
        },
      },
    ),
  );
  if (data.live_mode !== false || !Array.isArray(data.offers))
    throw new FlightSearchError(
      "Duffel returned an unexpected sandbox response.",
    );
  const offers = data.offers
    .map((offer) => normalizeOffer(offer, criteria))
    .filter((offer) => Date.parse(offer.expiresAt!) > Date.now());
  if (new Set(offers.map((offer) => offer.currency)).size > 1)
    throw new FlightSearchError(
      "The sandbox returned mixed currencies. This version requires one currency per search.",
    );
  return offers;
}

function normalizeSeatMaps(
  value: unknown,
  details: Pick<SandboxOfferDetails, "offer" | "segments" | "passengerIds">,
): OfferSeatMap[] {
  if (!Array.isArray(value))
    throw new FlightSearchError("The provider returned an invalid seat map.");
  return value.map((raw) => {
    const map = record(raw);
    const segmentId = text(map.segment_id);
    if (
      !details.segments.some((segment) => segment.id === segmentId) ||
      !Array.isArray(map.cabins)
    )
      throw new FlightSearchError(
        "The seat map does not match this itinerary.",
      );
    return {
      id: text(map.id),
      segmentId,
      cabins: map.cabins.map((rawCabin) => {
        const cabin = record(rawCabin);
        if (!Array.isArray(cabin.rows))
          throw new FlightSearchError(
            "The provider returned invalid cabin rows.",
          );
        return {
          deck: typeof cabin.deck === "number" ? cabin.deck : 0,
          rows: cabin.rows.map((rawRow) => {
            const row = record(rawRow);
            if (!Array.isArray(row.sections))
              throw new FlightSearchError(
                "The provider returned invalid seat sections.",
              );
            return {
              sections: row.sections.map((rawSection) => {
                const section = record(rawSection);
                if (!Array.isArray(section.elements))
                  throw new FlightSearchError(
                    "The provider returned invalid seat elements.",
                  );
                return section.elements.map((rawElement): SeatElement => {
                  const element = record(rawElement);
                  const type = text(element.type);
                  const disclosures = Array.isArray(element.disclosures)
                    ? element.disclosures.flatMap((item) => {
                        if (typeof item === "string") return [item];
                        if (
                          item &&
                          typeof item === "object" &&
                          typeof (item as Record<string, unknown>)
                            .description === "string"
                        )
                          return [(item as Record<string, string>).description];
                        return [];
                      })
                    : [];
                  const services =
                    type === "seat" && Array.isArray(element.available_services)
                      ? element.available_services
                          .map((rawService) => {
                            const service = record(rawService);
                            if (
                              service.total_currency !== details.offer.currency
                            )
                              throw new FlightSearchError(
                                "Seat prices use a different currency. This version cannot combine them.",
                              );
                            return {
                              id: text(service.id),
                              passengerId: text(service.passenger_id),
                              priceCents: amountInCents(
                                service.total_amount,
                                true,
                              ),
                            };
                          })
                          .filter((service) =>
                            details.passengerIds.includes(service.passengerId),
                          )
                      : [];
                  return {
                    type,
                    label:
                      type === "seat"
                        ? text(element.designator)
                        : typeof element.name === "string" && element.name
                          ? element.name
                          : type.replaceAll("_", " "),
                    disclosures,
                    services,
                  };
                });
              }),
            };
          }),
        };
      }),
    };
  });
}

export async function getDuffelOffer(
  id: string,
  criteria: SearchCriteria,
  signal: AbortSignal,
): Promise<SandboxOfferDetails> {
  const raw = record(
    await requestDuffel(
      `offers/${encodeURIComponent(id)}?return_available_services=true`,
      signal,
    ),
  );
  const offer = normalizeOffer(raw, criteria);
  if (offer.departureAt.slice(0, 10) !== criteria.date)
    throw new FlightSearchError(
      "The departure date does not match this search.",
      400,
    );
  if (offer.id !== id || Date.parse(offer.expiresAt!) <= Date.now())
    throw new FlightSearchError(
      "This offer has expired. Return to flights and search again.",
      410,
    );
  if (
    !Array.isArray(raw.passengers) ||
    raw.passengers.length !== criteria.passengers
  )
    throw new FlightSearchError(
      "The travelers do not match this search. Please search again.",
      400,
    );
  const passengerIds = raw.passengers.map((passenger) =>
    text(record(passenger).id),
  );
  const slice = record((raw.slices as unknown[])[0]);
  const segments = (slice.segments as unknown[]).map((item) => {
    const segment = record(item),
      origin = record(segment.origin),
      destination = record(segment.destination),
      carrier = record(segment.operating_carrier);
    return {
      id: text(segment.id),
      origin: text(origin.iata_code),
      destination: text(destination.iata_code),
      originName: text(origin.name),
      destinationName: text(destination.name),
      departureAt: localTimestamp(segment.departing_at),
      arrivalAt: localTimestamp(segment.arriving_at),
      operatingCarrier: text(carrier.name),
      flightNumber:
        `${typeof carrier.iata_code === "string" ? carrier.iata_code : ""} ${text(segment.operating_carrier_flight_number)}`.trim(),
    };
  });
  const details: SandboxOfferDetails = {
    offer,
    segments,
    passengerIds,
    seatMaps: [],
    baggage: [],
    includedBaggage: [],
    requiresDocuments: raw.passenger_identity_documents_required === true,
    fetchedAt: new Date().toISOString(),
  };
  for (const item of slice.segments as unknown[]) {
    const segment = record(item);
    for (const rawPassenger of Array.isArray(segment.passengers)
      ? segment.passengers
      : []) {
      const passenger = record(rawPassenger);
      for (const rawBag of Array.isArray(passenger.baggages)
        ? passenger.baggages
        : []) {
        const bag = record(rawBag);
        if (
          typeof bag.quantity === "number" &&
          Number.isInteger(bag.quantity) &&
          bag.quantity >= 0
        )
          details.includedBaggage.push({
            passengerId: text(passenger.passenger_id),
            segmentId: text(segment.id),
            type: text(bag.type),
            quantity: bag.quantity,
          });
      }
    }
  }
  for (const item of Array.isArray(raw.available_services)
    ? raw.available_services
    : []) {
    const service = record(item);
    if (service.type !== "baggage" || service.total_currency !== offer.currency)
      continue;
    const bag =
      service.metadata && typeof service.metadata === "object"
        ? record(service.metadata)
        : {};
    const passengers = Array.isArray(service.passenger_ids)
      ? service.passenger_ids.map(text)
      : [];
    const legs = Array.isArray(service.segment_ids)
      ? service.segment_ids.map(text)
      : [];
    if (
      !passengers.length ||
      !legs.length ||
      !passengers.every((id) => passengerIds.includes(id)) ||
      !legs.every((id) => segments.some((segment) => segment.id === id))
    )
      continue;
    const maximum =
      typeof service.maximum_quantity === "number"
        ? service.maximum_quantity
        : 1;
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10) continue;
    const label =
      typeof bag.maximum_weight_kg === "number"
        ? `Checked bag · up to ${bag.maximum_weight_kg} kg`
        : "Additional checked bag";
    const key = JSON.stringify([
      passengers.slice().sort(),
      legs.slice().sort(),
      label,
      bag.maximum_height_cm ?? null,
      bag.maximum_length_cm ?? null,
      bag.maximum_width_cm ?? null,
    ]);
    details.baggage.push({
      id: text(service.id),
      key,
      label,
      passengerIds: passengers,
      segmentIds: legs,
      priceCents: amountInCents(service.total_amount, true),
      maximumQuantity: maximum,
    });
  }
  try {
    details.seatMaps = normalizeSeatMaps(
      await requestDuffel(
        `seat_maps?offer_id=${encodeURIComponent(id)}`,
        signal,
      ),
      details,
    );
  } catch (error) {
    if (signal.aborted) throw error;
    details.seatMapError =
      error instanceof FlightSearchError
        ? error.message
        : "The seat map could not be loaded. Refresh this offer to try again.";
  }
  return details;
}
