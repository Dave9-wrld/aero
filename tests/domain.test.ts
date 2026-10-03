import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSearch,
  searchFromParams,
  searchToParams,
} from "../src/features/flight-search/model.ts";
import {
  createDemoOffers,
  flightProvider,
} from "../src/features/flight-results/provider.ts";
import { filterFlights } from "../src/features/flight-results/filter.ts";
import {
  getSeats,
  seatIndexForKey,
} from "../src/features/seat-selection/model.ts";
import {
  bookingReducer,
  bookingTotal,
  createDraft,
  hasAllSeats,
  restoreBookingState,
} from "../src/features/booking/model.ts";

const search = {
  origin: "LOS",
  destination: "LHR",
  date: "2099-01-15",
  passengers: 2,
};
const offers = createDemoOffers(search);
const offer = offers[0];

test("search rejects nonexistent dates, identical airports, past dates and invalid passenger counts", () => {
  assert.equal(validateSearch(search, "2099-01-01").date, undefined);
  assert.ok(
    validateSearch({ ...search, date: "2099-02-30" }, "2099-01-01").date,
  );
  assert.ok(
    validateSearch({ ...search, destination: "LOS" }, "2099-01-01").destination,
  );
  assert.ok(
    validateSearch({ ...search, date: "2098-12-31" }, "2099-01-01").date,
  );
  assert.ok(
    validateSearch({ ...search, passengers: 1.5 }, "2099-01-01").passengers,
  );
  assert.ok(
    validateSearch({ ...search, passengers: 5 }, "2099-01-01").passengers,
  );
});

test("search URL round trips and does not silently replace invalid input", () => {
  assert.deepEqual(searchFromParams(searchToParams(search)), search);
  assert.ok(
    validateSearch(
      searchFromParams(
        new URLSearchParams("from=LOS&to=LHR&date=bad&passengers=oops"),
      ),
    ).date,
  );
});

test("sample provider returns deterministic offers with valid integer prices and elapsed durations", () => {
  assert.deepEqual(createDemoOffers(search), offers);
  for (const item of offers) {
    assert.ok(Number.isInteger(item.priceCents) && item.priceCents > 0);
    assert.equal(
      (Date.parse(item.arrivalAt) - Date.parse(item.departureAt)) / 60000,
      item.durationMinutes,
    );
  }
  assert.deepEqual(
    createDemoOffers({ ...search, origin: "JFK", destination: "PHC" }),
    [],
  );
});

test("cancelled searches reject rather than returning stale results", async () => {
  const controller = new AbortController();
  const pending = flightProvider.search(search, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("filtering combines stops, airline and budget without mutating the source list", () => {
  const original = [...offers];
  const result = filterFlights(offers, {
    nonstop: true,
    airlines: ["northstar"],
    maxPriceCents: offer.priceCents,
    sort: "cheapest",
  });
  assert.ok(result.length > 0);
  assert.ok(
    result.every(
      (item) =>
        item.stops === 0 &&
        item.airline.id === "northstar" &&
        item.priceCents <= offer.priceCents,
    ),
  );
  assert.deepEqual(offers, original);
  const cheap = filterFlights(offers, {
    nonstop: false,
    airlines: [],
    maxPriceCents: null,
    sort: "cheapest",
  });
  assert.ok(
    cheap.every(
      (item, index) => !index || item.priceCents >= cheap[index - 1].priceCents,
    ),
  );
});

test("seat reducer prevents occupied seats and two travelers sharing a seat", () => {
  const seats = getSeats(offer.id);
  const free = seats.find((seat) => !seat.occupied)!;
  const taken = seats.find((seat) => seat.occupied)!;
  let state = { draft: createDraft(offer, search), confirmation: null };
  assert.deepEqual(
    bookingReducer(state, { type: "seat", traveler: 0, seat: taken.id }),
    state,
  );
  state = bookingReducer(state, {
    type: "seat",
    traveler: 0,
    seat: free.id,
  }) as typeof state;
  assert.equal(state.draft.seats[0], free.id);
  assert.deepEqual(
    bookingReducer(state, { type: "seat", traveler: 1, seat: free.id }),
    state,
  );
  assert.equal(hasAllSeats(state.draft), false);
});

test("price derives from traveler count, seat premiums and extra bags", () => {
  const draft = createDraft(offer, search);
  const premium = getSeats(offer.id).find(
    (seat) => seat.premium && !seat.occupied,
  )!;
  const standard = getSeats(offer.id).find(
    (seat) => !seat.premium && !seat.occupied,
  )!;
  draft.seats = [premium.id, standard.id];
  draft.bags = 2;
  assert.deepEqual(bookingTotal(draft), {
    fare: offer.priceCents * 2,
    seatFees: premium.priceCents,
    baggage: 6000000,
    total: offer.priceCents * 2 + premium.priceCents + 6000000,
  });
  assert.equal(hasAllSeats(draft), true);
});

test("confirmation requires all seats and valid traveler details", () => {
  const draft = createDraft(offer, search);
  const state = { draft, confirmation: null };
  const action = {
    type: "confirm" as const,
    reference: "AERO-ABC123",
    createdAt: "2099-01-01T00:00:00Z",
  };
  assert.equal(bookingReducer(state, action).confirmation, null);
  draft.seats = getSeats(offer.id)
    .filter((seat) => !seat.occupied)
    .slice(0, 2)
    .map((seat) => seat.id);
  draft.travelers = [
    { firstName: "Alex", lastName: "Traveler" },
    { firstName: "Jamie", lastName: "Traveler" },
  ];
  draft.email = "demo@aero.example";
  assert.equal(
    bookingReducer(state, action).confirmation?.reference,
    "AERO-ABC123",
  );
});

test("restoring a draft regenerates its fare and discards invalid or duplicate seats", () => {
  const draft = createDraft(offer, search);
  const seat = getSeats(offer.id).find((seat) => !seat.occupied)!;
  draft.offer = { ...draft.offer, priceCents: 1 };
  draft.seats = [seat.id, seat.id];
  const restored = restoreBookingState(JSON.stringify({ draft }));
  assert.equal(restored.draft?.offer.priceCents, offer.priceCents);
  assert.deepEqual(restored.draft?.seats, [seat.id, null]);
  assert.deepEqual(restoreBookingState("broken json"), {
    draft: null,
    confirmation: null,
  });
  assert.deepEqual(
    restoreBookingState(
      JSON.stringify({ draft: { criteria: { ...search, passengers: 900 } } }),
    ),
    { draft: null, confirmation: null },
  );
});

test("seat keyboard navigation stays within the map and respects row edges", () => {
  assert.equal(seatIndexForKey(0, "ArrowLeft"), 0);
  assert.equal(seatIndexForKey(5, "ArrowRight"), 5);
  assert.equal(seatIndexForKey(83, "ArrowDown"), 83);
  assert.equal(seatIndexForKey(79, "ArrowDown"), 79);
  assert.equal(seatIndexForKey(4, "ArrowUp"), 4);
  assert.equal(seatIndexForKey(13, "Home"), 12);
  assert.equal(seatIndexForKey(13, "End"), 17);
  assert.equal(seatIndexForKey(13, "ArrowUp"), 7);
});
