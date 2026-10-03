import type { SearchCriteria } from "../flight-search/types.ts";
import type { FlightOffer } from "../flight-results/types.ts";
import { createDemoOffers } from "../flight-results/provider.ts";
import { validateSearch } from "../flight-search/model.ts";
import { getSeats } from "../seat-selection/model.ts";

export type Traveler = { firstName: string; lastName: string };
export type BookingDraft = {
  criteria: SearchCriteria;
  offer: FlightOffer;
  seats: (string | null)[];
  travelers: Traveler[];
  email: string;
  bags: number;
};
export type Confirmation = {
  reference: string;
  createdAt: string;
  booking: BookingDraft;
};
export type BookingState = {
  draft: BookingDraft | null;
  confirmation: Confirmation | null;
};

export function createDraft(
  offer: FlightOffer,
  criteria: SearchCriteria,
): BookingDraft {
  return {
    offer,
    criteria,
    seats: Array(criteria.passengers).fill(null),
    travelers: Array.from({ length: criteria.passengers }, () => ({
      firstName: "",
      lastName: "",
    })),
    email: "",
    bags: 0,
  };
}

export function bookingTotal(draft: BookingDraft) {
  const seats = getSeats(draft.offer.id);
  const fare = draft.offer.priceCents * draft.criteria.passengers;
  const seatFees = draft.seats.reduce(
    (sum, id) => sum + (seats.find((seat) => seat.id === id)?.priceCents ?? 0),
    0,
  );
  const baggage = draft.bags * 3000000;
  return { fare, seatFees, baggage, total: fare + seatFees + baggage };
}

export function travelerErrors(draft: BookingDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  draft.travelers.forEach((traveler, index) => {
    for (const key of ["firstName", "lastName"] as const) {
      const value = traveler[key].trim();
      if (value.length < 2 || value.length > 60)
        errors[`${index}-${key}`] = "Enter a name between 2 and 60 characters.";
    }
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
    errors.email = "Enter a valid email address.";
  return errors;
}

export function hasAllSeats(draft: BookingDraft) {
  const seats = getSeats(draft.offer.id);
  return (
    draft.seats.length === draft.criteria.passengers &&
    new Set(draft.seats).size === draft.seats.length &&
    draft.seats.every((id) =>
      seats.some((seat) => seat.id === id && !seat.occupied),
    )
  );
}

export type BookingAction =
  | { type: "start"; offer: FlightOffer; criteria: SearchCriteria }
  | { type: "seat"; traveler: number; seat: string | null }
  | { type: "traveler"; index: number; value: Traveler }
  | { type: "email"; value: string }
  | { type: "bags"; value: number }
  | { type: "confirm"; reference: string; createdAt: string }
  | { type: "hydrate"; state: BookingState }
  | { type: "reset" };

export function bookingReducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  if (action.type === "hydrate") return action.state;
  if (action.type === "reset") return { draft: null, confirmation: null };
  if (action.type === "start" && action.offer.source === "duffel-sandbox")
    return state;
  if (action.type === "start")
    return {
      draft: createDraft(action.offer, action.criteria),
      confirmation: null,
    };
  const draft = state.draft;
  if (!draft) return state;
  if (action.type === "confirm") {
    if (!hasAllSeats(draft) || Object.keys(travelerErrors(draft)).length)
      return state;
    return {
      ...state,
      confirmation: {
        reference: action.reference,
        createdAt: action.createdAt,
        booking: draft,
      },
    };
  }
  if (action.type === "seat") {
    if (action.traveler < 0 || action.traveler >= draft.seats.length)
      return state;
    if (
      action.seat &&
      (!getSeats(draft.offer.id).some(
        (seat) => seat.id === action.seat && !seat.occupied,
      ) ||
        draft.seats.some(
          (seat, index) => index !== action.traveler && seat === action.seat,
        ))
    )
      return state;
    return {
      ...state,
      draft: {
        ...draft,
        seats: draft.seats.map((seat, index) =>
          index === action.traveler ? action.seat : seat,
        ),
      },
    };
  }
  if (action.type === "traveler")
    return {
      ...state,
      draft: {
        ...draft,
        travelers: draft.travelers.map((traveler, index) =>
          index === action.index ? action.value : traveler,
        ),
      },
    };
  if (action.type === "email")
    return { ...state, draft: { ...draft, email: action.value } };
  if (action.type === "bags")
    return {
      ...state,
      draft: {
        ...draft,
        bags: Math.max(
          0,
          Math.min(draft.criteria.passengers, Math.floor(action.value) || 0),
        ),
      },
    };
  return state;
}

// Restore the flight from our provider rather than trusting a price stored in the browser.
function restoreDraft(value: unknown): BookingDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BookingDraft>;
  const criteria = candidate.criteria;
  if (
    !criteria ||
    typeof criteria.origin !== "string" ||
    typeof criteria.destination !== "string" ||
    typeof criteria.date !== "string" ||
    typeof criteria.passengers !== "number" ||
    Object.keys(validateSearch(criteria)).length
  )
    return null;
  const offer = createDemoOffers(criteria).find(
    (item) => item.id === candidate.offer?.id,
  );
  if (!offer) return null;
  const draft = createDraft(offer, criteria);
  const seatMap = getSeats(offer.id);
  const assigned = new Set<string>();
  draft.seats = draft.seats.map((_, index) => {
    const id = candidate.seats?.[index];
    if (
      typeof id !== "string" ||
      assigned.has(id) ||
      !seatMap.some((seat) => seat.id === id && !seat.occupied)
    )
      return null;
    assigned.add(id);
    return id;
  });
  draft.travelers = draft.travelers.map((_, index) => ({
    firstName:
      typeof candidate.travelers?.[index]?.firstName === "string"
        ? candidate.travelers[index].firstName.slice(0, 60)
        : "",
    lastName:
      typeof candidate.travelers?.[index]?.lastName === "string"
        ? candidate.travelers[index].lastName.slice(0, 60)
        : "",
  }));
  draft.email =
    typeof candidate.email === "string" ? candidate.email.slice(0, 254) : "";
  draft.bags = Number.isInteger(candidate.bags)
    ? Math.max(0, Math.min(criteria.passengers, candidate.bags!))
    : 0;
  return draft;
}

export function restoreBookingState(raw: string | null): BookingState {
  const empty = { draft: null, confirmation: null };
  if (!raw) return empty;
  try {
    const candidate = JSON.parse(raw) as Partial<BookingState> | null;
    if (!candidate || typeof candidate !== "object") return empty;
    const draft = restoreDraft(candidate.draft);
    const confirmed = restoreDraft(candidate.confirmation?.booking);
    const confirmation =
      confirmed &&
      hasAllSeats(confirmed) &&
      !Object.keys(travelerErrors(confirmed)).length &&
      /^AERO-[A-Z0-9]{6}$/.test(candidate.confirmation?.reference ?? "") &&
      typeof candidate.confirmation?.createdAt === "string"
        ? {
            booking: confirmed,
            reference: candidate.confirmation.reference,
            createdAt: candidate.confirmation.createdAt,
          }
        : null;
    return { draft, confirmation };
  } catch {
    return empty;
  }
}
