import Icon from "@/components/Icon";
import { getAirport } from "@/data/airports";
import { duration, localTime, money, prettyDate } from "@/lib/format";
import { bookingTotal, type BookingDraft } from "./model";

export default function BookingSummary({ draft }: { draft: BookingDraft }) {
  const origin = getAirport(draft.offer.origin)!;
  const destination = getAirport(draft.offer.destination)!;
  const prices = bookingTotal(draft);
  return (
    <aside className="booking-summary">
      <p className="eyebrow">YOUR JOURNEY, AT A GLANCE</p>
      <h2>
        {origin.city} <span>↗</span> <em>{destination.city}</em>
      </h2>
      <p className="summary-date">
        {prettyDate(draft.criteria.date)} <span className="middle-dot">·</span>{" "}
        {draft.criteria.passengers} adult
        {draft.criteria.passengers > 1 ? "s" : ""}
      </p>
      <div className="summary-airline">
        <span
          className="airline-mark"
          style={{ background: draft.offer.airline.color }}
        >
          {draft.offer.airline.mark}
        </span>
        <div>
          <strong>{draft.offer.airline.name}</strong>
          <span>{draft.offer.flightNumber} · Economy</span>
        </div>
      </div>
      <div className="summary-timeline">
        <div>
          <strong>{localTime(draft.offer.departureAt, origin.timeZone)}</strong>
          <span>{origin.code}</span>
        </div>
        <div>
          <Icon name="plane" size={17} />
          <span>{duration(draft.offer.durationMinutes)}</span>
        </div>
        <div>
          <strong>
            {localTime(draft.offer.arrivalAt, destination.timeZone)}
          </strong>
          <span>{destination.code}</span>
        </div>
      </div>
      <dl className="price-breakdown">
        <div>
          <dt>Flights × {draft.criteria.passengers}</dt>
          <dd>{money(prices.fare)}</dd>
        </div>
        <div>
          <dt>Seat selection</dt>
          <dd>{prices.seatFees ? money(prices.seatFees) : "Included"}</dd>
        </div>
        <div>
          <dt>Extra checked bags × {draft.bags}</dt>
          <dd>{prices.baggage ? money(prices.baggage) : "None"}</dd>
        </div>
        <div>
          <dt>Taxes & fees</dt>
          <dd>Included</dd>
        </div>
      </dl>
      <div className="booking-total" aria-live="polite">
        <span>
          Total <small>NGN · sample fare</small>
        </span>
        <strong>{money(prices.total)}</strong>
      </div>
      <p className="summary-disclaimer">
        <Icon name="shield" size={16} />
        Demo booking. No payment is taken.
      </p>
    </aside>
  );
}
