"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useBooking } from "./BookingProvider";
import { useSandboxTrip } from "../sandbox-checkout/trip-store";
export default function TripLink() {
  const { state } = useBooking();
  const sandboxTrip = useSandboxTrip();
  return (
    <Link
      href={
        sandboxTrip &&
        (!state.confirmation ||
          Date.parse(sandboxTrip.createdAt) >
            Date.parse(state.confirmation.createdAt))
          ? "/sandbox-confirmation"
          : state.confirmation
            ? "/confirmation"
            : "/booking"
      }
      className="trip-link"
    >
      My trip <Icon name="arrow" size={16} />
    </Link>
  );
}
