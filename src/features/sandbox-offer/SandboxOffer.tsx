"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import BookingActionBar from "@/components/BookingActionBar";
import { PageLoading } from "@/components/Shell";
import {
  searchFromParams,
  searchToParams,
  validateSearch,
} from "@/features/flight-search/model";
import { money, prettyDate } from "@/lib/format";
import { sandboxOfferProvider } from "./provider";
import SandboxSeatMap from "./SandboxSeatMap";
import SandboxCheckout from "../sandbox-checkout/SandboxCheckout";
import type { BagChoice, CheckoutQuote } from "../sandbox-checkout/model";
import type {
  SandboxOfferDetails,
  SeatAssignment,
  SeatElement,
  OfferSeatMap,
} from "./types";

export default function SandboxOffer() {
  const params = useSearchParams();
  const id = params.get("offer") ?? "";
  const from = params.get("from"),
    to = params.get("to"),
    date = params.get("date"),
    passengers = params.get("passengers");
  const criteria = useMemo(
    () =>
      searchFromParams(
        new URLSearchParams({
          from: from ?? "",
          to: to ?? "",
          date: date ?? "",
          passengers: passengers ?? "",
        }),
      ),
    [from, to, date, passengers],
  );
  const search = searchToParams(criteria).toString();
  const back = `/flights?${search}&source=duffel`;
  const invalid =
    !/^off_[A-Za-z0-9]{6,100}$/.test(id) ||
    Object.keys(validateSearch(criteria)).length > 0;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: SandboxOfferDetails;
    error?: string;
  }>({ key: "" });
  const key = `${id}:${search}:${retry}`;
  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    setResult({ key });
    sandboxOfferProvider
      .get(id, criteria, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "This offer could not be loaded.",
          });
      });
    return () => controller.abort();
  }, [id, criteria, key, invalid]);
  if (invalid)
    return (
      <div className="container empty-state">
        <h1>Let’s find your flight first.</h1>
        <p>This offer link is incomplete or its search date has passed.</p>
        <Link href="/" className="button button-primary">
          Find a flight
        </Link>
      </div>
    );
  if (result.key !== key || (!result.data && !result.error))
    return <PageLoading />;
  if (result.error)
    return (
      <div className="container empty-state">
        <Icon name="info" size={35} />
        <h1>This flight needs another look.</h1>
        <p role="alert">{result.error}</p>
        <div className="confirmation-actions">
          <button
            className="button button-primary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
          <Link href={back} className="button button-outline">
            Back to flights
          </Link>
        </div>
      </div>
    );
  const quoted = Number(params.get("quoted"));
  return (
    <OfferExperience
      key={`${key}:${result.data!.fetchedAt}`}
      details={result.data!}
      criteria={criteria}
      back={back}
      quoted={Number.isSafeInteger(quoted) && quoted > 0 ? quoted : null}
      quotedCurrency={params.get("currency")}
      onRefresh={() => setRetry((value) => value + 1)}
    />
  );
}

function OfferExperience({
  details,
  criteria,
  back,
  quoted,
  quotedCurrency,
  onRefresh,
}: {
  details: SandboxOfferDetails;
  criteria: import("../flight-search/types").SearchCriteria;
  back: string;
  quoted: number | null;
  quotedCurrency: string | null;
  onRefresh: () => void;
}) {
  const { offer, segments, passengerIds, seatMaps } = details;
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [traveler, setTraveler] = useState(0);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState<"seats" | "extras" | "review">("seats");
  const [bags, setBags] = useState<BagChoice[]>([]);
  const [checkedQuote, setCheckedQuote] = useState<CheckoutQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [stage]);
  const [expired, setExpired] = useState(
    () => Date.parse(offer.expiresAt!) <= Date.now(),
  );
  useEffect(() => {
    const remaining = Date.parse(offer.expiresAt!) - Date.now();
    if (remaining <= 0) {
      setExpired(true);
      return;
    }
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [offer.expiresAt]);
  const segment = segments[segmentIndex];
  const maps = seatMaps.filter((map) => map.segmentId === segment.id);
  const seatFees =
    checkedQuote?.seatCents ??
    assignments.reduce((sum, item) => sum + item.priceCents, 0);
  const bagFees =
    checkedQuote?.bagCents ??
    bags.reduce(
      (sum, choice) =>
        sum +
        (details.baggage.find((bag) => bag.key === choice.key)?.priceCents ??
          0) *
          choice.quantity,
      0,
    );
  const fare = checkedQuote?.fareCents ?? offer.priceCents;
  const summaryCurrency = checkedQuote?.currency ?? offer.currency;
  const changed =
    quoted !== null &&
    (quoted !== offer.priceCents || quotedCurrency !== offer.currency);
  function selectSeat(seat: SeatElement, map: OfferSeatMap) {
    if (expired) return;
    const passengerId = passengerIds[traveler];
    const service = seat.services.find(
      (item) => item.passengerId === passengerId,
    );
    if (!service) return;
    const owner = assignments.find(
      (item) => item.segmentId === map.segmentId && item.seat === seat.label,
    );
    if (owner && owner.passengerId !== passengerId) {
      setNotice(
        `Seat ${seat.label} is already selected for traveler ${passengerIds.indexOf(owner.passengerId) + 1}. Choose another seat.`,
      );
      return;
    }
    const deselect = owner?.passengerId === passengerId;
    setAssignments((previous) => {
      const others = previous.filter(
        (item) =>
          item.segmentId !== map.segmentId || item.passengerId !== passengerId,
      );
      return deselect
        ? others
        : [
            ...others,
            {
              mapId: map.id,
              segmentId: map.segmentId,
              passengerId,
              seat: seat.label,
              serviceId: service.id,
              priceCents: service.priceCents,
            },
          ];
    });
    setNotice(
      deselect
        ? `Seat choice removed for traveler ${traveler + 1}.`
        : `Seat ${seat.label} selected for traveler ${traveler + 1}. ${service.priceCents ? `${money(service.priceCents, offer.currency)} extra.` : "No seat fee."} This is a preview; nothing is reserved.`,
    );
  }
  return (
    <div className="container booking-page sandbox-offer-page">
      <div className="breadcrumb">
        <Link href={back}>Choose your flight</Link>
        <Icon name="chevron" size={13} />
        <span>Your sandbox journey</span>
      </div>
      <div className="booking-heading">
        <p className="eyebrow">A LITTLE MORE CERTAINTY</p>
        <h1 ref={heading} tabIndex={-1}>
          {stage === "seats" ? (
            <>
              Your flight. <em>Your space.</em>
            </>
          ) : stage === "extras" ? (
            <>
              A few <em>little details.</em>
            </>
          ) : (
            <>
              Ready for <em>takeoff?</em>
            </>
          )}
        </h1>
        <p>
          Current test fare and aircraft seats, straight from Duffel’s sandbox.
        </p>
      </div>
      <div className="sandbox-offer-status">
        <span className="sample-label">
          <span className="status-dot" />
          Duffel sandbox
        </span>
        <p>
          {expired
            ? "This offer has expired. Search again to continue."
            : "Test mode · Fictional travelers · No real payment"}
        </p>
        <button
          className="text-button"
          disabled={busy || recoveryPending}
          onClick={onRefresh}
        >
          Refresh offer
        </button>
      </div>
      <nav className="booking-stepper" aria-label="Sandbox booking steps">
        {(["seats", "extras", "review"] as const).map((item, index) => (
          <button
            key={item}
            className={stage === item ? "step-current" : ""}
            aria-current={stage === item ? "step" : undefined}
            disabled={
              busy ||
              recoveryPending ||
              expired ||
              (item === "review" && stage !== "review")
            }
            onClick={() => {
              if (stage !== item) {
                setCheckedQuote(null);
                setStage(item);
              }
            }}
          >
            <span>0{index + 1}</span>
            {["Seats (optional)", "Bags & travelers", "Review"][index]}
            {index < 2 && <i />}
          </button>
        ))}
      </nav>
      {changed && (
        <p className="booking-alert" role="status">
          The fare has changed since your search. Current fare:{" "}
          {money(offer.priceCents, offer.currency)} for all travelers. Review it
          before continuing.
        </p>
      )}
      {expired && (
        <p className="booking-alert" role="alert">
          This offer has expired.{" "}
          <Link className="text-link" href={back}>
            Search for fresh flights →
          </Link>
        </p>
      )}
      <div className="booking-layout">
        <div className="booking-content">
          <details className="booking-section sandbox-itinerary">
            <summary>
              <div>
                <strong>
                  {offer.origin} → {offer.destination} · {offer.airline.name}
                </strong>
                <span>
                  {prettyDate(offer.departureAt.slice(0, 10), true)} · Flight
                  details
                </span>
              </div>
              <Icon name="chevron" size={17} />
            </summary>
            <div className="sandbox-itinerary-content">
              <div className="booking-section-heading">
                <span className="section-icon">
                  <Icon name="plane" size={22} />
                </span>
                <div>
                  <h2>A closer look at your flight.</h2>
                  <p>
                    {offer.airline.name} ·{" "}
                    {prettyDate(offer.departureAt.slice(0, 10), true)} ·{" "}
                    {passengerIds.length} adult
                    {passengerIds.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {segments.map((item, index) => (
                <div className="sandbox-segment-detail" key={item.id}>
                  <span className="sandbox-leg-number">0{index + 1}</span>
                  <div>
                    <strong>
                      {item.origin} → {item.destination}
                    </strong>
                    <p>
                      {item.originName} → {item.destinationName}
                    </p>
                    <span>
                      {item.departureAt.slice(11, 16)} departure ·{" "}
                      {item.arrivalAt.slice(11, 16)} arrival ·{" "}
                      {item.arrivalAt.slice(0, 10)}
                      <br />
                      Operated by {item.operatingCarrier} · {item.flightNumber}
                    </span>
                  </div>
                </div>
              ))}
              <p className="sandbox-small-note">
                All departure and arrival times use the airport’s local time.
              </p>
            </div>
          </details>
          {stage === "seats" ? (
            <>
              <section className="booking-section sandbox-seat-selection">
                <div className="booking-section-heading">
                  <span className="section-icon">
                    <Icon name="seat" size={22} />
                  </span>
                  <div>
                    <h2>Find your little corner.</h2>
                    <p>
                      Seats are optional. Choose your favorite or let the
                      airline assign one.
                    </p>
                  </div>
                </div>
                <div
                  className="sandbox-segment-tabs"
                  role="group"
                  aria-label="Choose flight segment"
                >
                  {segments.map((item, index) => (
                    <button
                      key={item.id}
                      aria-pressed={segmentIndex === index}
                      onClick={() => {
                        setSegmentIndex(index);
                        setNotice("");
                      }}
                    >
                      Flight {index + 1} · {item.origin} → {item.destination}
                    </button>
                  ))}
                </div>
                <div
                  className="traveler-tabs"
                  role="group"
                  aria-label="Choose traveler for sandbox seats"
                >
                  {passengerIds.map((id, index) => (
                    <button
                      key={id}
                      aria-pressed={traveler === index}
                      onClick={() => {
                        setTraveler(index);
                        setNotice("");
                      }}
                    >
                      <Icon name="user" size={15} />
                      <span>Traveler {index + 1}</span>
                      <strong>
                        {assignments.find(
                          (item) =>
                            item.segmentId === segment.id &&
                            item.passengerId === id,
                        )?.seat ?? "Choose seat"}
                      </strong>
                    </button>
                  ))}
                </div>
                <div className="seat-legend">
                  <span>
                    <i />
                    Free
                  </span>
                  <span>
                    <i className="legend-premium" />
                    Paid
                  </span>
                  <span>
                    <i className="legend-selected" />
                    Selected
                  </span>
                  <span>
                    <i className="legend-occupied" />
                    Unavailable for traveler
                  </span>
                </div>
                <p className="sandbox-small-note">
                  Tab into the map, use arrow keys to move, then Enter or Space
                  to choose. Seat fees can differ by traveler.
                </p>
                {details.seatMapError ? (
                  <div className="inline-empty">
                    <h3>The seat map needs another moment.</h3>
                    <p role="alert">{details.seatMapError}</p>
                    <button
                      className="button button-outline"
                      onClick={onRefresh}
                    >
                      Try loading seats again
                    </button>
                  </div>
                ) : maps.length ? (
                  maps.map((map) => (
                    <SandboxSeatMap
                      key={map.id}
                      map={map}
                      passengerId={passengerIds[traveler]}
                      passengerIndex={traveler}
                      passengerIds={passengerIds}
                      currency={offer.currency}
                      assignments={assignments}
                      disabled={expired}
                      onSelect={selectSeat}
                    />
                  ))
                ) : (
                  <div className="inline-empty">
                    <Icon name="seat" size={30} />
                    <h3>No seat map for this flight.</h3>
                    <p>
                      The airline hasn’t supplied selectable seats for this
                      segment. You can still review its current offer.
                    </p>
                  </div>
                )}
                <p className="seat-notice" role="status" aria-live="polite">
                  {notice ||
                    `Viewing seats for traveler ${traveler + 1} on ${segment.origin} → ${segment.destination}.`}
                </p>
              </section>
              <BookingActionBar
                step="Step 1 of 3 · Optional seats"
                total={`${money(fare + seatFees + bagFees, summaryCurrency)} · estimated total`}
                hint={
                  expired
                    ? "This offer expired. Return to flights for a fresh fare."
                    : `${assignments.length} seat${assignments.length === 1 ? "" : "s"} selected. Continue without seats if you prefer.`
                }
              >
                <Link className="text-link" href={back}>
                  ← Back to flights
                </Link>
                <button
                  className="button button-primary"
                  disabled={expired}
                  onClick={() => setStage("extras")}
                >
                  Continue to bags <Icon name="arrow" size={16} />
                </button>
              </BookingActionBar>
            </>
          ) : (
            <SandboxCheckout
              details={details}
              criteria={criteria}
              seats={assignments}
              bags={bags}
              onBags={(next) => {
                setBags(next);
                setCheckedQuote(null);
              }}
              stage={stage}
              onStage={(next) => {
                if (next !== "review") setCheckedQuote(null);
                setStage(next);
              }}
              onBusy={setBusy}
              onRecovery={setRecoveryPending}
              onQuote={setCheckedQuote}
            />
          )}
        </div>
        <aside className="booking-summary sandbox-preview-summary">
          <p className="eyebrow">YOUR TEST TRIP</p>
          <h2>
            {offer.origin} <span>↗</span> <em>{offer.destination}</em>
          </h2>
          <p className="summary-date">
            {passengerIds.length} adult{passengerIds.length === 1 ? "" : "s"} ·
            One way · Economy
          </p>
          <dl className="price-breakdown">
            <div>
              <dt>Current fare · all travelers</dt>
              <dd>{money(fare, summaryCurrency)}</dd>
            </div>
            <div>
              <dt>Selected seat fees</dt>
              <dd>{money(seatFees, summaryCurrency)}</dd>
            </div>
            <div>
              <dt>Extra bags</dt>
              <dd>{money(bagFees, summaryCurrency)}</dd>
            </div>
            <div>
              <dt>Taxes</dt>
              <dd>Included in fare</dd>
            </div>
          </dl>
          <div className="sandbox-assignment-summary">
            {assignments.length ? (
              assignments.map((item) => (
                <div key={`${item.segmentId}:${item.passengerId}`}>
                  <span>
                    Flight{" "}
                    {segments.findIndex(
                      (segment) => segment.id === item.segmentId,
                    ) + 1}{" "}
                    · Traveler {passengerIds.indexOf(item.passengerId) + 1}
                  </span>
                  <strong>{item.seat}</strong>
                </div>
              ))
            ) : (
              <p>No seats selected yet.</p>
            )}
          </div>
          <div className="booking-total" aria-live="polite">
            <span>
              {checkedQuote ? "Checked total" : "Estimated total"}
              <small>
                {summaryCurrency} · {expired ? "Expired offer" : "Sandbox fare"}
              </small>
            </span>
            <strong>{money(fare + seatFees + bagFees, summaryCurrency)}</strong>
          </div>
          <p className="sandbox-summary-note">
            <Icon name="info" size={18} />
            No real travel or payment. We check prices before confirming your
            test booking. Refreshing clears your choices.
          </p>
        </aside>
      </div>
    </div>
  );
}
