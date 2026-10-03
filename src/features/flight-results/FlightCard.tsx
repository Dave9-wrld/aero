import Icon from "@/components/Icon";
import { getAirport } from "@/data/airports";
import { duration, localTime, localDay, money } from "@/lib/format";
import type { FlightOffer } from "./types";

export default function FlightCard({
  offer,
  passengers,
  badge,
  onSelect,
  disabled,
}: {
  offer: FlightOffer;
  passengers: number;
  badge?: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const origin = getAirport(offer.origin)!;
  const destination = getAirport(offer.destination)!;
  const dayOffset = Math.round(
    (Date.parse(
      `${localDay(offer.arrivalAt, destination.timeZone)}T12:00:00Z`,
    ) -
      Date.parse(`${localDay(offer.departureAt, origin.timeZone)}T12:00:00Z`)) /
      86400000,
  );
  const sandbox = offer.source === "duffel-sandbox";
  return (
    <article className="flight-card">
      {badge && (
        <span
          className={`flight-badge ${badge === "Lowest fare" ? "badge-soft" : ""}`}
        >
          {badge === "Aero pick" && <span>✳</span>}
          {badge}
        </span>
      )}
      <div className="flight-card-main">
        <div className="airline">
          <span
            className="airline-mark"
            style={{ background: offer.airline.color }}
          >
            {offer.airline.mark}
          </span>
          <div>
            <strong>{offer.airline.name}</strong>
            <span>
              {offer.flightNumber} <span className="middle-dot">·</span> Economy
            </span>
            {sandbox && (
              <span className="operating-carriers">
                Operated by {offer.operatingCarriers?.join(" / ")}
              </span>
            )}
          </div>
        </div>
        <div className="flight-timeline">
          <div>
            <strong>{localTime(offer.departureAt, origin.timeZone)}</strong>
            <span>{origin.code}</span>
          </div>
          <div className="flight-line">
            <span>{duration(offer.durationMinutes)}</span>
            <div className="route-line">
              <i />
              <Icon name="plane" size={15} />
              <i />
            </div>
            <span className={offer.stops === 0 ? "nonstop-label" : ""}>
              {offer.stops === 0
                ? "Nonstop"
                : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
            </span>
          </div>
          <div>
            <strong>
              {localTime(offer.arrivalAt, destination.timeZone)}
              {dayOffset !== 0 && (
                <sup>
                  {dayOffset > 0 ? "+" : ""}
                  {dayOffset}
                </sup>
              )}
            </strong>
            <span>{destination.code}</span>
          </div>
        </div>
        <div className="flight-price">
          <strong>{money(offer.priceCents, offer.currency)}</strong>
          <span>
            {sandbox
              ? `total for ${passengers} adult${passengers === 1 ? "" : "s"}`
              : "per adult"}{" "}
            · taxes included
          </span>
          <button
            className="button button-primary"
            onClick={onSelect}
            disabled={disabled}
          >
            {sandbox ? "View flight & seats" : "Choose flight"}{" "}
            <Icon name="arrow" size={17} />
          </button>
          {!sandbox && passengers > 1 && (
            <small>
              {money(offer.priceCents * passengers)} for {passengers} adults
            </small>
          )}
        </div>
      </div>
      <div className="flight-card-bottom">
        <span>
          <Icon name="bag" size={14} />
          {sandbox
            ? "View current fare and available seats"
            : "7 kg cabin bag included"}
        </span>
        <details>
          <summary>
            Flight details <Icon name="chevron" size={12} />
          </summary>
          <div>
            <p>
              <strong>{origin.name}</strong> →{" "}
              <strong>{destination.name}</strong>
            </p>
            <p>
              Times are shown in each airport’s local time.{" "}
              {offer.stops
                ? `This test itinerary includes ${offer.stops} stop${offer.stops === 1 ? "" : "s"}.`
                : "This test itinerary is nonstop."}
            </p>
            <p>
              {sandbox
                ? `Duffel sandbox offer · ${offer.currency}. Prices cover every adult in this search. Choose seats, add optional bags and create a fictional test booking.`
                : "Sample airline, fare and availability. No real ticket is issued."}
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}
