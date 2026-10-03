"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { PageLoading } from "@/components/Shell";
import { money, prettyDate } from "@/lib/format";
import { useSandboxTrip } from "./trip-store";

export default function SandboxConfirmation() {
  const receipt = useSandboxTrip();
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState("");
  useEffect(() => setReady(true), []);
  if (!ready) return <PageLoading />;
  if (!receipt)
    return (
      <div className="container empty-state">
        <Icon name="plane" size={40} />
        <h1>Your trip starts with a flight.</h1>
        <p>No sandbox confirmation is saved in this tab yet.</p>
        <Link className="button button-primary" href="/">
          Find a flight
        </Link>
      </div>
    );
  async function copy() {
    try {
      await navigator.clipboard.writeText(receipt!.reference);
      setCopied("Test reference copied.");
    } catch {
      setCopied("Select and copy the reference shown below.");
    }
  }
  return (
    <div className="container sandbox-confirmation-page">
      <div className="confirmation-hero">
        <span className="confirmation-check">
          <Icon name="check" size={30} />
        </span>
        <p className="eyebrow">A JOURNEY THROUGH THE SANDBOX</p>
        <h1>
          All set. <em>In test mode.</em>
        </h1>
        <p>
          Duffel confirmed your fictional trip. Here’s everything in one place.
        </p>
        <span className="sample-label">
          <span className="status-dot" />
          Duffel sandbox · Not valid for travel
        </span>
      </div>
      {receipt.memoryOnly && (
        <p className="booking-alert no-print" role="status">
          Your browser blocked saving this receipt. Print or save your itinerary
          before refreshing or closing the tab.
        </p>
      )}
      <section
        className="sandbox-receipt"
        aria-label="Sandbox itinerary receipt"
      >
        <div className="receipt-top">
          <div>
            <p className="eyebrow">TEST BOOKING REFERENCE</p>
            <strong className="receipt-reference">{receipt.reference}</strong>
          </div>
          <button className="button button-outline no-print" onClick={copy}>
            Copy reference
          </button>
        </div>
        <p className="seat-notice" role="status">
          {copied}
        </p>
        <h2>
          {receipt.details.offer.origin} <span>→</span>{" "}
          <em>{receipt.details.offer.destination}</em>
        </h2>
        <p>
          {prettyDate(receipt.details.offer.departureAt.slice(0, 10), true)} ·
          One way · Economy
        </p>
        <div className="receipt-itinerary">
          {receipt.details.segments.map((segment, index) => (
            <div key={segment.id}>
              <span className="profile-number">0{index + 1}</span>
              <div>
                <h3>
                  {segment.origin} → {segment.destination}
                </h3>
                <p>
                  {segment.departureAt.slice(11, 16)} departure ·{" "}
                  {segment.arrivalAt.slice(11, 16)} arrival (
                  {segment.arrivalAt.slice(0, 10)})
                </p>
                <p>
                  Operated by {segment.operatingCarrier} ·{" "}
                  {segment.flightNumber}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="sandbox-small-note">
          Times are local to each airport. This is a test itinerary receipt, not
          a boarding pass.
        </p>
        <div className="receipt-travelers">
          {receipt.travelers.map((traveler, index) => (
            <div key={index}>
              <strong>{traveler.name}</strong>
              <p>
                {receipt.details.segments
                  .map(
                    (segment, leg) =>
                      `Flight ${leg + 1}: ${receipt.seats.find((seat) => seat.passengerId === receipt.details.passengerIds[index] && seat.segmentId === segment.id)?.seat ?? "Airline-assigned seat"}`,
                  )
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
        {receipt.bags.map((bag, index) => (
          <p className="sandbox-small-note" key={index}>
            {bag.quantity} × {bag.label} · Traveler
            {bag.passengerIds.length > 1 ? "s" : ""}{" "}
            {bag.passengerIds
              .map((id) => receipt.details.passengerIds.indexOf(id) + 1)
              .join(", ")}
          </p>
        ))}
        <dl className="price-breakdown">
          <div>
            <dt>Flight fare</dt>
            <dd>{money(receipt.fareCents, receipt.currency)}</dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>{money(receipt.seatCents, receipt.currency)}</dd>
          </div>
          <div>
            <dt>Extra bags</dt>
            <dd>{money(receipt.bagCents, receipt.currency)}</dd>
          </div>
        </dl>
        <div className="booking-total">
          <span>
            Confirmed test total<small>No real payment</small>
          </span>
          <strong>{money(receipt.totalCents, receipt.currency)}</strong>
        </div>
        <p className="sandbox-small-note">
          Test order {receipt.id} · Saved in this browser tab. You can find it
          in Duffel’s Developer test dashboard.
        </p>
      </section>
      <div className="confirmation-actions no-print">
        <button
          className="button button-primary"
          onClick={() => window.print()}
        >
          <Icon name="print" size={17} />
          Print / save itinerary
        </button>
        <Link className="button button-outline" href="/">
          Explore another trip <Icon name="arrow" size={17} />
        </Link>
      </div>
    </div>
  );
}
