"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import BookingActionBar from "@/components/BookingActionBar";
import { money, prettyDate } from "@/lib/format";
import type { SearchCriteria } from "../flight-search/types";
import type {
  SandboxOfferDetails,
  SeatAssignment,
} from "../sandbox-offer/types";
import {
  demoTravelers,
  type BagChoice,
  type CheckoutQuote,
  type SandboxReceipt,
} from "./model";
import { saveSandboxTrip } from "./trip-store";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/flights/checkout/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "This step could not be completed.",
    );
  return data as T;
}
export default function SandboxCheckout({
  details,
  criteria,
  seats,
  bags,
  onBags,
  stage,
  onStage,
  onBusy,
  onQuote,
  onRecovery,
}: {
  details: SandboxOfferDetails;
  criteria: SearchCriteria;
  seats: SeatAssignment[];
  bags: BagChoice[];
  onBags: (bags: BagChoice[]) => void;
  stage: "extras" | "review";
  onStage: (stage: "seats" | "extras" | "review") => void;
  onBusy: (busy: boolean) => void;
  onQuote: (quote: CheckoutQuote | null) => void;
  onRecovery: (recovering: boolean) => void;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const gate = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!quote) return;
    setExpired(false);
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(quote.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [quote]);
  useEffect(() => {
    if (error) feedback.current?.focus();
  }, [error]);
  async function checkPrice() {
    if (gate.current) return;
    gate.current = true;
    setPending(true);
    onBusy(true);
    setError("");
    setAccepted(false);
    try {
      const next = await post<CheckoutQuote>("quote", {
        offerId: details.offer.id,
        criteria,
        seats: seats.map(({ passengerId, segmentId, seat }) => ({
          passengerId,
          segmentId,
          seat,
        })),
        bags,
      });
      setQuote(next);
      onQuote(next);
      onStage("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not check this price.",
      );
    } finally {
      gate.current = false;
      setPending(false);
      onBusy(false);
    }
  }
  async function confirm() {
    if (gate.current || (!recoveryToken && (!quote || expired))) return;
    if (!recoveryToken && !accepted) {
      const consent = document.getElementById("sandbox-consent");
      consent?.focus({ preventScroll: true });
      consent?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    gate.current = true;
    setPending(true);
    onBusy(true);
    setError("");
    try {
      const receipt = await post<SandboxReceipt>("order", {
        token: recoveryToken ?? quote!.token,
        recoverOnly: Boolean(recoveryToken),
        acceptDemo: true,
      });
      saveSandboxTrip(receipt);
      router.push("/sandbox-confirmation");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not confirm this test booking.",
      );
      setRecoveryToken(recoveryToken ?? quote!.token);
      onRecovery(true);
      setAccepted(false);
    } finally {
      gate.current = false;
      setPending(false);
      onBusy(false);
    }
  }
  const selectionTotal =
    details.offer.priceCents +
    seats.reduce((sum, seat) => sum + seat.priceCents, 0) +
    bags.reduce(
      (sum, choice) =>
        sum +
        (details.baggage.find((bag) => bag.key === choice.key)?.priceCents ??
          0) *
          choice.quantity,
      0,
    );
  return (
    <div className="sandbox-checkout" aria-busy={pending}>
      {stage === "extras" ? (
        <>
          <section className="booking-section">
            <div className="booking-section-heading">
              <span className="section-icon">
                <Icon name="bag" size={22} />
              </span>
              <div>
                <h2>A little room for more.</h2>
                <p>Bags are optional. Only add what you need.</p>
              </div>
            </div>
            <div className="included-bags">
              <h3>What’s already included</h3>
              {details.passengerIds.map((id, index) => (
                <div key={id}>
                  <strong>Traveler {index + 1}</strong>
                  {details.segments.map((segment, leg) => {
                    const allowances = details.includedBaggage.filter(
                      (bag) =>
                        bag.passengerId === id && bag.segmentId === segment.id,
                    );
                    return (
                      <p key={segment.id}>
                        Flight {leg + 1} · {segment.origin} →{" "}
                        {segment.destination}:{" "}
                        {allowances.length
                          ? allowances
                              .map(
                                (bag) =>
                                  `${bag.quantity} ${bag.type.replaceAll("_", " ")} bag${bag.quantity === 1 ? "" : "s"}`,
                              )
                              .join(" · ")
                          : "The airline has not supplied a baggage allowance."}
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>
            {details.baggage.length ? (
              <div className="sandbox-bag-list">
                {details.baggage.map((bag, index) => (
                  <div className="sandbox-bag-option" key={bag.id}>
                    <div>
                      <h3>{bag.label}</h3>
                      <p>
                        Traveler{bag.passengerIds.length > 1 ? "s" : ""}{" "}
                        {bag.passengerIds
                          .map((id) => details.passengerIds.indexOf(id) + 1)
                          .join(", ")}{" "}
                        · Flight{bag.segmentIds.length > 1 ? "s" : ""}{" "}
                        {bag.segmentIds
                          .map(
                            (id) =>
                              details.segments.findIndex((s) => s.id === id) +
                              1,
                          )
                          .join(", ")}
                      </p>
                      <strong>
                        {money(bag.priceCents, details.offer.currency)} per bag
                      </strong>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`bag-${index}`}>Extra bags</label>
                      <select
                        id={`bag-${index}`}
                        value={
                          bags.find((b) => b.key === bag.key)?.quantity ?? 0
                        }
                        disabled={pending}
                        onChange={(event) => {
                          const quantity = Number(event.target.value);
                          onBags([
                            ...bags.filter((b) => b.key !== bag.key),
                            ...(quantity ? [{ key: bag.key, quantity }] : []),
                          ]);
                        }}
                      >
                        {Array.from(
                          { length: bag.maximumQuantity + 1 },
                          (_, count) => (
                            <option key={count} value={count}>
                              {count === 0
                                ? "No extra bag"
                                : `${count} extra bag${count === 1 ? "" : "s"}`}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sandbox-small-note">
                No additional bags are offered for this itinerary. You can
                continue without extras.
              </p>
            )}
          </section>
          <section className="booking-section demo-travelers">
            <div className="booking-section-heading">
              <span className="section-icon">
                <Icon name="user" size={22} />
              </span>
              <div>
                <h2>Your demo travel companions.</h2>
                <p>
                  These fictional profiles are sent to Duffel’s test
                  environment. No personal details needed.
                </p>
              </div>
            </div>
            {details.passengerIds.map((id, index) => (
              <div className="demo-profile" key={id}>
                <span className="profile-number">0{index + 1}</span>
                <div>
                  <strong>
                    {demoTravelers[index].given_name}{" "}
                    {demoTravelers[index].family_name}
                  </strong>
                  <p>Adult · Born {demoTravelers[index].born_on}</p>
                </div>
                <span className="sample-label">Fictional</span>
              </div>
            ))}
            <p className="sandbox-small-note">
              Demo contact: demo@aero.example · No email or SMS is sent.
            </p>
          </section>
        </>
      ) : (
        <section className="booking-section sandbox-final-review">
          <div className="booking-section-heading">
            <span className="section-icon">
              <Icon name="check" size={22} />
            </span>
            <div>
              <h2>One last look.</h2>
              <p>
                Review the freshly checked total before creating a test booking.
              </p>
            </div>
          </div>
          {quote ? (
            <>
              <div className="review-price-banner">
                <span>Latest total · all travelers</span>
                <strong>{money(quote.totalCents, quote.currency)}</strong>
                <p>
                  {prettyDate(criteria.date, true)} ·{" "}
                  {details.passengerIds.length} adult
                  {details.passengerIds.length === 1 ? "" : "s"}
                </p>
              </div>
              {(quote.totalCents !== selectionTotal ||
                quote.currency !== details.offer.currency) && (
                <p className="booking-alert" role="status">
                  The price changed during the check. The latest total above
                  replaces your earlier estimate.
                </p>
              )}
              <dl className="price-breakdown">
                <div>
                  <dt>Flight fare</dt>
                  <dd>{money(quote.fareCents, quote.currency)}</dd>
                </div>
                <div>
                  <dt>Seats</dt>
                  <dd>{money(quote.seatCents, quote.currency)}</dd>
                </div>
                <div>
                  <dt>Extra bags</dt>
                  <dd>{money(quote.bagCents, quote.currency)}</dd>
                </div>
                <div>
                  <dt>Taxes</dt>
                  <dd>Included</dd>
                </div>
              </dl>
              <div className="review-travelers">
                {details.passengerIds.map((id, index) => (
                  <div key={id}>
                    <strong>
                      {demoTravelers[index].given_name}{" "}
                      {demoTravelers[index].family_name}
                    </strong>
                    <p>
                      {details.segments
                        .map(
                          (s, leg) =>
                            `Flight ${leg + 1}: ${quote.seats.find((seat) => seat.passengerId === id && seat.segmentId === s.id)?.seat ?? "Airline-assigned seat"}`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
              {quote.bags.map((bag, index) => (
                <p className="sandbox-small-note" key={index}>
                  {bag.quantity} × {bag.label} ·{" "}
                  {money(bag.priceCents * bag.quantity, quote.currency)}
                </p>
              ))}
              <p className="sandbox-small-note">
                {expired
                  ? "This price check expired. Check again to continue."
                  : "This price check lasts up to 2 minutes. We recheck once more when you confirm."}
              </p>
              <label className="demo-consent">
                <input
                  id="sandbox-consent"
                  type="checkbox"
                  checked={accepted}
                  disabled={pending || expired}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
                <span>
                  I understand this creates a Duffel test booking for fictional
                  travelers. No real flight is booked and no real money is
                  charged.
                </span>
              </label>
            </>
          ) : (
            <p className="sandbox-small-note">
              Check the latest price again before continuing.
            </p>
          )}
        </section>
      )}
      {error && (
        <p className="booking-alert" role="alert" tabIndex={-1} ref={feedback}>
          {error}
        </p>
      )}
      {pending && (
        <p className="seat-notice" role="status">
          {stage === "extras"
            ? "Checking current fares and extras…"
            : "Working with Duffel’s test environment. Keep this tab open…"}
        </p>
      )}
      <BookingActionBar
        step={
          stage === "extras"
            ? "Step 2 of 3 · Bags & travelers"
            : "Step 3 of 3 · Review"
        }
        total={`${money(quote?.totalCents ?? selectionTotal, quote?.currency ?? details.offer.currency)} · ${quote ? "checked" : "estimated"} total`}
        hint={
          recoveryToken
            ? "Check status to recover your booking. This does not create another order."
            : pending
              ? "Keep this tab open while we contact Duffel."
              : stage === "extras"
                ? "Bags are optional. Continue to review your current fare."
                : expired
                  ? "Your price check expired. Refresh the price to continue."
                  : !accepted && quote
                    ? "Tick the test booking acknowledgment above to confirm."
                    : "Review your choices. No real travel or payment."
        }
      >
        <button
          className="text-button"
          disabled={pending || Boolean(recoveryToken)}
          onClick={() => {
            setError("");
            setQuote(null);
            onStage(stage === "extras" ? "seats" : "extras");
          }}
        >
          ← {stage === "extras" ? "Back to seats" : "Edit extras"}
        </button>
        {recoveryToken ? (
          <button
            className="button button-primary"
            disabled={pending}
            onClick={confirm}
          >
            {pending ? "Checking booking…" : "Check booking status"}
          </button>
        ) : stage === "extras" || !quote || expired ? (
          <button
            className="button button-primary"
            disabled={pending}
            onClick={checkPrice}
          >
            {pending
              ? "Checking price…"
              : stage === "extras"
                ? "Continue to review"
                : "Refresh price"}
            <Icon name="arrow" size={16} />
          </button>
        ) : (
          <button
            className="button button-primary"
            disabled={pending}
            onClick={confirm}
          >
            {pending
              ? "Creating test booking…"
              : !accepted
                ? "Review acknowledgment"
                : "Create test booking"}
            <Icon name="arrow" size={16} />
          </button>
        )}
      </BookingActionBar>
    </div>
  );
}
