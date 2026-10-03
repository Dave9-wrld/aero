"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { PageLoading } from "@/components/Shell";
import { getAirport } from "@/data/airports";
import { money, prettyDate, localTime } from "@/lib/format";
import { bookingTotal } from "./model";
import { useBooking } from "./BookingProvider";

export default function ConfirmationView() {
  const { state, ready } = useBooking();
  if (!ready) return <PageLoading />;
  const confirmation = state.confirmation;
  if (!confirmation)
    return (
      <div className="container empty-state">
        <Icon name="plane" size={42} />
        <h1>A journey is waiting to happen.</h1>
        <p>Complete a sample booking to see your demo itinerary here.</p>
        <Link
          className="button button-primary"
          href={state.draft ? "/booking" : "/"}
        >
          Continue your journey <Icon name="arrow" size={17} />
        </Link>
      </div>
    );
  const draft = confirmation.booking;
  const origin = getAirport(draft.offer.origin)!;
  const destination = getAirport(draft.offer.destination)!;
  return (
    <div className="container confirmation-page">
      <div className="confirmation-heading">
        <span className="success-mark">
          <Icon name="check" size={29} />
        </span>
        <p className="eyebrow">A LITTLE CLOSER TO SOMEWHERE NEW</p>
        <h1>
          Your next chapter
          <br />
          <em>looks good on you.</em>
        </h1>
        <p>
          Your demo itinerary is ready. Keep a little reminder of where you
          could go.
        </p>
      </div>
      <article className="boarding-pass">
        <div className="pass-main">
          <div className="pass-top">
            <span className="brand">
              aero<span className="brand-period">.</span>
            </span>
            <span className="pass-demo-label">DEMO BOARDING PASS</span>
          </div>
          <div className="pass-route">
            <div>
              <strong>{origin.code}</strong>
              <span>{origin.city}</span>
            </div>
            <div className="pass-flight-line">
              <Icon name="plane" size={26} />
              <span>ONE WAY · ECONOMY</span>
            </div>
            <div>
              <strong>{destination.code}</strong>
              <span>{destination.city}</span>
            </div>
          </div>
          <div className="pass-facts">
            <div>
              <span>DEPARTURE DATE</span>
              <strong>{prettyDate(draft.criteria.date)}</strong>
            </div>
            <div>
              <span>DEPARTURE TIME</span>
              <strong>
                {localTime(draft.offer.departureAt, origin.timeZone)}{" "}
                <small>local</small>
              </strong>
            </div>
            <div>
              <span>FLIGHT</span>
              <strong>{draft.offer.flightNumber}</strong>
            </div>
            <div>
              <span>SEATS</span>
              <strong>{draft.seats.join(", ")}</strong>
            </div>
          </div>
          <div className="pass-travelers">
            <span>TRAVELERS</span>
            <strong>
              {draft.travelers
                .map(
                  (traveler) =>
                    `${traveler.firstName.trim()} ${traveler.lastName.trim()}`,
                )
                .join(" · ")}
            </strong>
          </div>
          <p className="pass-fine-print">
            For portfolio demonstration only. Not valid for travel.
          </p>
        </div>
        <div className="pass-stub">
          <Icon name="plane" size={27} />
          <span>YOUR DEMO REFERENCE</span>
          <strong>{confirmation.reference}</strong>
          <div className="demo-barcode" aria-hidden="true">
            {Array.from({ length: 34 }, (_, index) => (
              <i
                key={index}
                style={{
                  width: `${index % 3 === 0 ? 3 : index % 2 === 0 ? 2 : 1}px`,
                }}
              />
            ))}
          </div>
          <span>Sample itinerary total</span>
          <b>{money(bookingTotal(draft).total)}</b>
        </div>
      </article>
      <div className="confirmation-actions">
        <button
          className="button button-primary"
          onClick={() => window.print()}
        >
          <Icon name="print" size={18} />
          Print / save PDF
        </button>
        <Link href="/" className="button button-outline">
          Plan another trip <Icon name="arrow" size={17} />
        </Link>
      </div>
      <p className="confirmation-note">
        <Icon name="info" size={15} />
        No actual flight was booked, no payment was taken, and no email was
        sent.
      </p>
    </div>
  );
}
