import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { validateSearch } from "../flight-search/model";
import {
  FlightSearchError,
  getDuffelOffer,
  requestDuffel,
  record,
  text,
  amountInCents,
} from "../flight-results/duffel.server";
import {
  demoTravelers,
  type CheckoutSelection,
  type CheckoutQuote,
  type SandboxReceipt,
  type SeatChoice,
  type BagChoice,
} from "./model";

function inputRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new FlightSearchError("Please provide valid booking choices.", 400);
  return value as Record<string, unknown>;
}
export function parseSelection(input: unknown): CheckoutSelection {
  const body = inputRecord(input),
    criteria = inputRecord(body.criteria);
  if (
    typeof body.offerId !== "string" ||
    !/^off_[A-Za-z0-9]{6,100}$/.test(body.offerId) ||
    typeof criteria.origin !== "string" ||
    typeof criteria.destination !== "string" ||
    typeof criteria.date !== "string" ||
    typeof criteria.passengers !== "number"
  )
    throw new FlightSearchError(
      "Please choose a flight before continuing.",
      400,
    );
  const search = {
    origin: criteria.origin,
    destination: criteria.destination,
    date: criteria.date,
    passengers: criteria.passengers,
  };
  if (Object.keys(validateSearch(search)).length)
    throw new FlightSearchError("Please check your search details.", 400);
  if (
    !Array.isArray(body.seats) ||
    body.seats.length > 16 ||
    !Array.isArray(body.bags) ||
    body.bags.length > 40
  )
    throw new FlightSearchError("Please check your seat and bag choices.", 400);
  const seats = body.seats.map((raw): SeatChoice => {
    const item = inputRecord(raw);
    if (
      typeof item.passengerId !== "string" ||
      item.passengerId.length > 100 ||
      typeof item.segmentId !== "string" ||
      item.segmentId.length > 100 ||
      typeof item.seat !== "string" ||
      !/^\d{1,3}[A-Z]{1,2}$/.test(item.seat)
    )
      throw new FlightSearchError("A seat choice is invalid.", 400);
    return {
      passengerId: item.passengerId,
      segmentId: item.segmentId,
      seat: item.seat,
    };
  });
  const bags = body.bags.map((raw): BagChoice => {
    const item = inputRecord(raw);
    if (
      typeof item.key !== "string" ||
      item.key.length > 1600 ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    )
      throw new FlightSearchError("A baggage choice is invalid.", 400);
    return { key: item.key, quantity: item.quantity };
  });
  if (
    new Set(seats.map((s) => `${s.passengerId}:${s.segmentId}`)).size !==
      seats.length ||
    new Set(seats.map((s) => `${s.segmentId}:${s.seat}`)).size !==
      seats.length ||
    new Set(bags.map((b) => b.key)).size !== bags.length
  )
    throw new FlightSearchError("Remove duplicate seat or bag choices.", 400);
  return { offerId: body.offerId, criteria: search, seats, bags };
}

async function resolve(selection: CheckoutSelection, signal: AbortSignal) {
  const details = await getDuffelOffer(
    selection.offerId,
    selection.criteria,
    signal,
  );
  if (details.requiresDocuments)
    throw new FlightSearchError(
      "This airline needs identity documents. Choose Duffel Airways for a booking with fictional travelers.",
      422,
    );
  if (selection.seats.length && details.seatMapError)
    throw new FlightSearchError(
      "We could not recheck your seats. Return to seats and try again.",
      409,
    );
  const seats = selection.seats.map((choice) => {
    const matches = [];
    for (const map of details.seatMaps) {
      if (map.segmentId !== choice.segmentId) continue;
      for (const cabin of map.cabins)
        for (const row of cabin.rows)
          for (const section of row.sections)
            for (const seat of section) {
              if (seat.type !== "seat" || seat.label !== choice.seat) continue;
              for (const service of seat.services)
                if (service.passengerId === choice.passengerId)
                  matches.push({
                    ...choice,
                    mapId: map.id,
                    serviceId: service.id,
                    priceCents: service.priceCents,
                  });
            }
    }
    if (matches.length !== 1)
      throw new FlightSearchError(
        `Seat ${choice.seat} is no longer available. Return to seats and choose again.`,
        409,
      );
    return matches[0];
  });
  const bags = selection.bags.map((choice) => {
    const matches = details.baggage.filter((bag) => bag.key === choice.key);
    if (matches.length !== 1 || choice.quantity > matches[0].maximumQuantity)
      throw new FlightSearchError(
        "A selected bag is no longer available. Return to bags and choose again.",
        409,
      );
    return { ...matches[0], quantity: choice.quantity };
  });
  const fareCents = details.offer.priceCents;
  const seatCents = seats.reduce((sum, seat) => sum + seat.priceCents, 0);
  const bagCents = bags.reduce(
    (sum, bag) => sum + bag.quantity * bag.priceCents,
    0,
  );
  const totalCents = fareCents + seatCents + bagCents;
  if (!Number.isSafeInteger(totalCents))
    throw new FlightSearchError("The total could not be calculated.");
  return {
    details,
    seats,
    bags,
    fareCents,
    seatCents,
    bagCents,
    totalCents,
    currency: details.offer.currency,
  };
}
function secret() {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
  if (!token?.startsWith("duffel_test_"))
    throw new FlightSearchError(
      "Configure a Duffel test token to continue.",
      503,
    );
  return token;
}
type Approval = {
  selection: CheckoutSelection;
  totalCents: number;
  currency: string;
  expires: number;
  receiptBasis: Pick<SandboxReceipt, "details" | "seats" | "bags" | "fareCents" | "seatCents" | "bagCents">;
};
function signature(payload: string) {
  return createHmac("sha256", secret())
    .update(`aero-checkout-v1:${payload}`)
    .digest("base64url");
}
function sign(approval: Approval) {
  const payload = Buffer.from(JSON.stringify(approval)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
function verify(token: string, recovering = false): Approval {
  const parts = token.split(".");
  if (parts.length !== 2 || token.length > 20000)
    throw new FlightSearchError("Please check the latest price again.", 400);
  const expected = Buffer.from(signature(parts[0])),
    supplied = Buffer.from(parts[1]);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    throw new FlightSearchError("Please check the latest price again.", 400);
  const raw = JSON.parse(
    Buffer.from(parts[0], "base64url").toString(),
  ) as Approval;
  if (!Number.isFinite(raw.expires) || (!recovering && raw.expires <= Date.now()))
    throw new FlightSearchError(
      "Your price check expired. Check the latest price again.",
      409,
    );
  return { ...raw, selection: parseSelection(raw.selection) };
}
export async function quoteCheckout(
  input: unknown,
  signal: AbortSignal,
): Promise<CheckoutQuote> {
  const selection = parseSelection(input),
    result = await resolve(selection, signal);
  const expires = Math.min(
    Date.now() + 120000,
    Date.parse(result.details.offer.expiresAt!),
  );
  return {
    ...result,
    token: sign({
      selection,
      totalCents: result.totalCents,
      currency: result.currency,
      expires,
      receiptBasis: {
        details: { ...result.details, seatMaps: [], baggage: [] },
        seats: result.seats,
        bags: result.bags.map(({ label, quantity, priceCents, passengerIds, segmentIds }) => ({ label, quantity, priceCents, passengerIds, segmentIds })),
        fareCents: result.fareCents,
        seatCents: result.seatCents,
        bagCents: result.bagCents,
      },
    }),
    expiresAt: new Date(expires).toISOString(),
  };
}


// Duffel stores confirmed orders and allows only one booked offer per offer request.
// This process guard coalesces concurrent submissions; provider uniqueness protects
// across instances. A missing response is reconciled by GET, never a POST retry.
const attempts = new Map<string, Promise<SandboxReceipt>>();
function quoteId(token: string) { return createHash("sha256").update(token).digest("hex"); }
function receiptFromOrder(raw: Record<string, unknown>, approval: Approval, token: string): SandboxReceipt {
  if (raw.live_mode !== false || raw.offer_id !== approval.selection.offerId ||
      record(raw.metadata).quote_id !== quoteId(token) ||
      text(raw.total_currency) !== approval.currency || amountInCents(raw.total_amount) !== approval.totalCents)
    throw new FlightSearchError("This order needs checking in the Duffel test dashboard. Start a new search for another booking.", 409);
  return {
    ...approval.receiptBasis,
    source: "duffel-sandbox",
    id: text(raw.id), reference: text(raw.booking_reference), createdAt: text(raw.created_at),
    currency: text(raw.total_currency), totalCents: amountInCents(raw.total_amount),
    travelers: demoTravelers.slice(0, approval.selection.criteria.passengers).map(p => ({name: p.given_name + " " + p.family_name, bornOn: p.born_on})),
  };
}
async function recoverOrder(approval: Approval, token: string): Promise<SandboxReceipt | null> {
  const orders = await requestDuffel("orders?offer_id=" + encodeURIComponent(approval.selection.offerId) + "&limit=2", new AbortController().signal);
  if (!Array.isArray(orders) || orders.length > 1)
    throw new FlightSearchError("Could not verify this booking. Check the Duffel test dashboard.", 502);
  return orders.length ? receiptFromOrder(record(orders[0]), approval, token) : null;
}
export async function createSandboxOrder(input: unknown): Promise<SandboxReceipt> {
  const body = inputRecord(input);
  if (body.acceptDemo !== true || typeof body.token !== "string")
    throw new FlightSearchError("Confirm that this is a fictional test booking.", 400);
  // Expired signatures remain valid for read-only recovery, never a new mutation.
  const approval = verify(body.token, true), token = body.token;
  const previous = await recoverOrder(approval, token);
  if (previous) return previous;
  if (body.recoverOnly === true)
    throw new FlightSearchError("Duffel has not confirmed a booking yet. Check status again shortly or check the Developer test dashboard. No booking was resubmitted.", 409);
  verify(token);
  const existing = attempts.get(approval.selection.offerId);
  if (existing) return existing;
  if (attempts.size >= 2000)
    throw new FlightSearchError("The demo is busy. Please start a new search later.", 503);
  const attempt = submitOrder(approval, token);
  attempts.set(approval.selection.offerId, attempt);
  return attempt;
}
async function submitOrder(approval: Approval, token: string): Promise<SandboxReceipt> {
  const result = await resolve(approval.selection, new AbortController().signal);
  if (result.totalCents !== approval.totalCents || result.currency !== approval.currency)
    throw new FlightSearchError("The total changed. Start a new search and review the latest price before confirming.", 409);
  const profiles = result.details.passengerIds.map((id, index) => ({
    ...demoTravelers[index], id, email: "demo@aero.example",
    // Duffel's published guide example; never a visitor's phone number.
    phone_number: "+442080160508",
  }));
  const services = [
    ...result.seats.map(seat => ({id: seat.serviceId, quantity: 1})),
    ...result.bags.map(bag => ({id: bag.id, quantity: bag.quantity})),
  ];
  let raw: Record<string, unknown>;
  try {
    raw = record(await requestDuffel("orders", new AbortController().signal, {data: {
      type: "instant", selected_offers: [approval.selection.offerId], passengers: profiles,
      payments: [{type: "balance", currency: result.currency, amount: (result.totalCents / 100).toFixed(2)}],
      ...(services.length ? {services} : {}),
      metadata: {app: "aero_portfolio_demo", quote_id: quoteId(token)},
    }}));
  } catch {
    const confirmed = await recoverOrder(approval, token).catch(() => null);
    if (confirmed) return confirmed;
    throw new FlightSearchError("The test booking was not confirmed. Use Check booking status; this action only reads Duffel's saved orders. You can also check the Developer test dashboard.", 502);
  }
  return receiptFromOrder(raw, approval, token);
}
