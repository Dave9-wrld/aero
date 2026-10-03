import type { FlightOffer } from "../flight-results/types";

export type OfferSegment = {
  id: string;
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
  departureAt: string;
  arrivalAt: string;
  operatingCarrier: string;
  flightNumber: string;
};
export type SeatService = {
  id: string;
  passengerId: string;
  priceCents: number;
};
export type SeatElement = {
  type: string;
  label: string;
  disclosures: string[];
  services: SeatService[];
};
export type OfferSeatMap = {
  id: string;
  segmentId: string;
  cabins: {
    deck: number;
    rows: { sections: SeatElement[][] }[];
  }[];
};
export type SandboxOfferDetails = {
  offer: FlightOffer;
  segments: OfferSegment[];
  passengerIds: string[];
  seatMaps: OfferSeatMap[];
  seatMapError?: string;
  baggage: BaggageService[];
  includedBaggage: {
    passengerId: string;
    segmentId: string;
    type: string;
    quantity: number;
  }[];
  requiresDocuments: boolean;
  fetchedAt: string;
};
export type BaggageService = {
  id: string;
  key: string;
  label: string;
  passengerIds: string[];
  segmentIds: string[];
  priceCents: number;
  maximumQuantity: number;
};
export type SeatAssignment = {
  mapId: string;
  segmentId: string;
  passengerId: string;
  seat: string;
  serviceId: string;
  priceCents: number;
};
