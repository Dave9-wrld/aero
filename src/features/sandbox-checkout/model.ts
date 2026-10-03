import type { SearchCriteria } from "../flight-search/types";
import type {
  SandboxOfferDetails,
  SeatAssignment,
} from "../sandbox-offer/types";

// Fixed fictional profiles: the sandbox never accepts personal passenger data.
export const demoTravelers = [
  {
    given_name: "Alex",
    family_name: "Traveler",
    title: "mr",
    gender: "m",
    born_on: "1994-06-15",
  },
  {
    given_name: "Jamie",
    family_name: "Traveler",
    title: "ms",
    gender: "f",
    born_on: "1996-02-20",
  },
  {
    given_name: "Taylor",
    family_name: "Traveler",
    title: "mr",
    gender: "m",
    born_on: "1992-09-10",
  },
  {
    given_name: "Jordan",
    family_name: "Traveler",
    title: "ms",
    gender: "f",
    born_on: "1995-11-05",
  },
] as const;
export type SeatChoice = Pick<
  SeatAssignment,
  "passengerId" | "segmentId" | "seat"
>;
export type BagChoice = { key: string; quantity: number };
export type CheckoutSelection = {
  offerId: string;
  criteria: SearchCriteria;
  seats: SeatChoice[];
  bags: BagChoice[];
};
export type CheckoutQuote = {
  token: string;
  expiresAt: string;
  currency: string;
  fareCents: number;
  seatCents: number;
  bagCents: number;
  totalCents: number;
  seats: SeatAssignment[];
  bags: {
    label: string;
    quantity: number;
    priceCents: number;
    passengerIds: string[];
    segmentIds: string[];
  }[];
  details: SandboxOfferDetails;
};
export type SandboxReceipt = {
  memoryOnly?: boolean;
  source: "duffel-sandbox";
  id: string;
  reference: string;
  createdAt: string;
  currency: string;
  totalCents: number;
  fareCents: number;
  seatCents: number;
  bagCents: number;
  details: SandboxOfferDetails;
  seats: SeatAssignment[];
  bags: CheckoutQuote["bags"];
  travelers: { name: string; bornOn: string }[];
};
export const receiptStorageKey = "aero-sandbox-receipt-v1";
