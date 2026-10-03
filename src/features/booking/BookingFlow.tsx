"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { PageLoading } from "@/components/Shell";
import { searchToParams } from "@/features/flight-search/model";
import SeatSelection from "@/features/seat-selection/SeatSelection";
import { money } from "@/lib/format";
import { useBooking } from "./BookingProvider";
import {
  bookingTotal,
  hasAllSeats,
  travelerErrors,
  type BookingDraft,
} from "./model";
import BookingSummary from "./BookingSummary";

const stages = ["seats", "travelers", "review"] as const;
type Stage = (typeof stages)[number];

function MobileTotal({ draft }: { draft: BookingDraft }) {
  return (
    <div className="mobile-booking-total">
      <span>Total · sample fare</span>
      <strong>{money(bookingTotal(draft).total)}</strong>
    </div>
  );
}

export default function BookingFlow() {
  const { state, dispatch, ready } = useBooking();
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  if (!ready) return <PageLoading />;
  const draft = state.draft;
  if (!draft)
    return (
      <div className="container empty-state">
        <Icon name="plane" size={42} />
        <p className="eyebrow">EVERY JOURNEY HAS A BEGINNING</p>
        <h1>Your next trip starts here.</h1>
        <p>Choose a flight to begin your sample booking.</p>
        <Link className="button button-primary" href="/">
          Find a flight <Icon name="arrow" size={17} />
        </Link>
      </div>
    );
  const requested = params.get("step") as Stage | null;
  const seatsReady = hasAllSeats(draft);
  const travelersReady = !Object.keys(travelerErrors(draft)).length;
  const stage: Stage =
    requested === "review"
      ? !seatsReady
        ? "seats"
        : !travelersReady
          ? "travelers"
          : "review"
      : requested === "travelers" && seatsReady
        ? "travelers"
        : "seats";
  const stageIndex = stages.indexOf(stage);
  function navigate(next: Stage) {
    if (next !== "seats" && !seatsReady) {
      setNotice("Choose a seat for every traveler to continue.");
      return;
    }
    if (next === "review" && !travelersReady) {
      setErrors(travelerErrors(draft!));
      setNotice("Please complete the traveler details.");
      return;
    }
    setNotice("");
    setErrors({});
    router.push(`/booking?step=${next}`);
  }
  function submitTravelers(event: FormEvent) {
    event.preventDefault();
    const nextErrors = travelerErrors(draft!);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice("Please check the highlighted traveler details.");
      return;
    }
    navigate("review");
  }
  async function confirm() {
    if (pending) return;
    if (!hasAllSeats(draft!) || Object.keys(travelerErrors(draft!)).length) {
      setNotice("Please finish your seat selection and traveler details.");
      return;
    }
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const reference = `AERO-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => alphabet[value % alphabet.length]).join("")}`;
    dispatch({
      type: "confirm",
      reference,
      createdAt: new Date().toISOString(),
    });
    router.push("/confirmation");
  }
  return (
    <div className="container booking-page">
      <div className="breadcrumb">
        <Link href={`/flights?${searchToParams(draft.criteria)}`}>
          Choose your flight
        </Link>
        <Icon name="chevron" size={13} />
        <span>Make it your journey</span>
      </div>
      <div className="booking-heading">
        <p className="eyebrow">THE LITTLE DETAILS</p>
        <h1>
          Make it <em>your journey.</em>
        </h1>
        <p>Your flight is picked. Let’s make the rest feel right.</p>
      </div>
      <nav className="booking-stepper" aria-label="Booking steps">
        {stages.map((item, index) => (
          <button
            key={item}
            aria-current={stage === item ? "step" : undefined}
            className={`${index === stageIndex ? "step-current" : ""} ${index < stageIndex ? "step-complete" : ""}`}
            onClick={() => navigate(item)}
            disabled={pending}
          >
            <span>
              {index < stageIndex ? (
                <Icon name="check" size={14} />
              ) : (
                `0${index + 1}`
              )}
            </span>
            {["Your seat", "Your details", "A final look"][index]}
            {index < 2 && <i />}
          </button>
        ))}
      </nav>
      <div className="booking-layout">
        <div className="booking-content">
          {stage === "seats" && (
            <>
              <SeatSelection draft={draft} dispatch={dispatch} />
              <div className="booking-navigation">
                <MobileTotal draft={draft} />
                <Link
                  className="text-link"
                  href={`/flights?${searchToParams(draft.criteria)}`}
                >
                  ← Back to flights
                </Link>
                <button
                  className="button button-primary"
                  onClick={() => navigate("travelers")}
                >
                  Traveler details <Icon name="arrow" size={17} />
                </button>
              </div>
            </>
          )}
          {stage === "travelers" && (
            <form onSubmit={submitTravelers} noValidate>
              <section className="booking-section">
                <div className="booking-section-heading">
                  <span className="section-icon">
                    <Icon name="user" size={22} />
                  </span>
                  <div>
                    <h2>Who’s coming along?</h2>
                    <p>Use sample names and email for this portfolio demo.</p>
                  </div>
                </div>
                <button
                  className="sample-fill-button"
                  type="button"
                  onClick={() => {
                    ["Alex", "Jamie", "Taylor", "Jordan"]
                      .slice(0, draft.criteria.passengers)
                      .forEach((firstName, index) =>
                        dispatch({
                          type: "traveler",
                          index,
                          value: { firstName, lastName: "Traveler" },
                        }),
                      );
                    dispatch({ type: "email", value: "demo@aero.example" });
                    setErrors({});
                    setNotice("Sample traveler details added.");
                  }}
                >
                  <Icon name="user" size={16} />
                  Fill sample details <Icon name="arrow" size={15} />
                </button>
                {draft.travelers.map((traveler, index) => (
                  <fieldset className="traveler-form" key={index}>
                    <legend>
                      <span>0{index + 1}</span>Traveler {index + 1}
                      <small>Seat {draft.seats[index]}</small>
                    </legend>
                    <div className="form-row">
                      {(["firstName", "lastName"] as const).map((field) => (
                        <div className="form-field" key={field}>
                          <label htmlFor={`${field}-${index}`}>
                            {field === "firstName" ? "First name" : "Last name"}
                          </label>
                          <input
                            id={`${field}-${index}`}
                            maxLength={60}
                            value={traveler[field]}
                            placeholder={
                              field === "firstName"
                                ? "e.g. Alex"
                                : "e.g. Traveler"
                            }
                            autoComplete="off"
                            aria-invalid={!!errors[`${index}-${field}`]}
                            aria-describedby={
                              errors[`${index}-${field}`]
                                ? `${field}-${index}-error`
                                : undefined
                            }
                            onChange={(event) =>
                              dispatch({
                                type: "traveler",
                                index,
                                value: {
                                  ...traveler,
                                  [field]: event.target.value,
                                },
                              })
                            }
                          />
                          {errors[`${index}-${field}`] && (
                            <span
                              className="field-error"
                              id={`${field}-${index}-error`}
                            >
                              {errors[`${index}-${field}`]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="contact-form-section">
                  <h3>A place for your itinerary</h3>
                  <p>This demo does not send emails.</p>
                  <div className="form-field">
                    <label htmlFor="contact-email">Contact email</label>
                    <input
                      id="contact-email"
                      type="email"
                      maxLength={254}
                      placeholder="demo@aero.example"
                      value={draft.email}
                      autoComplete="off"
                      aria-invalid={!!errors.email}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                      onChange={(event) =>
                        dispatch({ type: "email", value: event.target.value })
                      }
                    />
                    {errors.email && (
                      <span className="field-error" id="email-error">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="baggage-panel">
                  <div>
                    <Icon name="bag" size={24} />
                    <div>
                      <h3>A little extra room</h3>
                      <p>
                        7 kg cabin bag per adult included.
                        <br />
                        Add 23 kg checked bags for {money(3000000)} each.
                      </p>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor="extra-bags">
                    Additional checked bags
                  </label>
                  <select
                    id="extra-bags"
                    value={draft.bags}
                    onChange={(event) =>
                      dispatch({
                        type: "bags",
                        value: Number(event.target.value),
                      })
                    }
                  >
                    {Array.from(
                      { length: draft.criteria.passengers + 1 },
                      (_, count) => (
                        <option key={count} value={count}>
                          {count === 0
                            ? "No extra bags"
                            : `${count} checked bag${count > 1 ? "s" : ""}`}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </section>
              <div className="booking-navigation">
                <MobileTotal draft={draft} />
                <button
                  className="text-button"
                  type="button"
                  onClick={() => navigate("seats")}
                >
                  ← Back to seats
                </button>
                <button className="button button-primary" type="submit">
                  Review your trip <Icon name="arrow" size={17} />
                </button>
              </div>
            </form>
          )}
          {stage === "review" && (
            <>
              <section className="booking-section review-section">
                <div className="booking-section-heading">
                  <span className="section-icon">
                    <Icon name="check" size={22} />
                  </span>
                  <div>
                    <h2>One last look.</h2>
                    <p>All the little details, in one place.</p>
                  </div>
                </div>
                <div className="review-label">
                  <h3>Your travelers</h3>
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => navigate("travelers")}
                  >
                    Edit details
                  </button>
                </div>
                {draft.travelers.map((traveler, index) => (
                  <div className="review-traveler" key={index}>
                    <span className="review-avatar">
                      <Icon name="user" size={18} />
                    </span>
                    <div>
                      <strong>
                        {traveler.firstName.trim()} {traveler.lastName.trim()}
                      </strong>
                      <span>Adult · Economy · 7 kg cabin bag</span>
                    </div>
                    <span className="seat-chip">Seat {draft.seats[index]}</span>
                  </div>
                ))}
                <dl className="review-details">
                  <div>
                    <dt>Contact email</dt>
                    <dd>{draft.email.trim()}</dd>
                  </div>
                  <div>
                    <dt>Extra checked bags</dt>
                    <dd>{draft.bags || "None"}</dd>
                  </div>
                </dl>
                <div className="review-demo-note">
                  <Icon name="info" size={21} />
                  <div>
                    <strong>Your itinerary is a demo.</strong>
                    <p>
                      These flights and prices are sample data. Confirming
                      creates a sample itinerary; no reservation, payment, or
                      email is made.
                    </p>
                  </div>
                </div>
              </section>
              <div className="booking-navigation">
                <MobileTotal draft={draft} />
                <button
                  className="text-button"
                  disabled={pending}
                  onClick={() => navigate("travelers")}
                >
                  ← Back to details
                </button>
                <button
                  className="button button-primary"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? "Preparing your itinerary…" : "Confirm demo trip"}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            </>
          )}
          {notice && (
            <p className="booking-alert" role="alert">
              {notice}
            </p>
          )}
        </div>
        <BookingSummary draft={draft} />
      </div>
    </div>
  );
}
