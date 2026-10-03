"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useBooking } from "./BookingProvider";
import { useSandboxTrip } from "../sandbox-checkout/trip-store";
import { hasAllSeats, travelerErrors } from "./model";
export default function TripLink() {
  const { state } = useBooking();
  const sandboxTrip = useSandboxTrip();
  const completedTrip =
    sandboxTrip &&
    (!state.confirmation ||
      Date.parse(sandboxTrip.createdAt) >
        Date.parse(state.confirmation.createdAt))
      ? "/sandbox-confirmation"
      : state.confirmation
        ? "/confirmation"
        : null;
  const activeDraft = !state.confirmation ? state.draft : null;
  const resumeStep = activeDraft
    ? !hasAllSeats(activeDraft)
      ? "seats"
      : Object.keys(travelerErrors(activeDraft)).length
        ? "travelers"
        : "review"
    : null;
  return (
    <Link
      href={
        resumeStep
          ? `/booking?step=${resumeStep}`
          : (completedTrip ?? "/#flight-search")
      }
      className="trip-link"
    >
      {resumeStep
        ? "Continue booking"
        : completedTrip
          ? "My trip"
          : "Find flights"}{" "}
      <Icon name="arrow" size={16} />
    </Link>
  );
}
