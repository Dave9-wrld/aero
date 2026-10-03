"use client";

import { useRef, useState, type Dispatch } from "react";
import Icon from "@/components/Icon";
import { money } from "@/lib/format";
import type { BookingAction, BookingDraft } from "@/features/booking/model";
import { getSeats, seatIndexForKey } from "./model";

export default function SeatSelection({
  draft,
  dispatch,
}: {
  draft: BookingDraft;
  dispatch: Dispatch<BookingAction>;
}) {
  const seats = getSeats(draft.offer.id);
  const [traveler, setTraveler] = useState(0);
  const [focusIndex, setFocusIndex] = useState(() =>
    seats.findIndex((seat) => !seat.occupied),
  );
  const [notice, setNotice] = useState("");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function select(id: string) {
    const seat = seats.find((item) => item.id === id)!;
    if (seat.occupied) {
      setNotice(`Seat ${id} is occupied. Choose another seat.`);
      return;
    }
    const owner = draft.seats.indexOf(id);
    if (owner !== -1 && owner !== traveler) {
      setNotice(
        `Seat ${id} belongs to traveler ${owner + 1}. Choose another seat.`,
      );
      return;
    }
    const deselect = draft.seats[traveler] === id;
    dispatch({ type: "seat", traveler, seat: deselect ? null : id });
    setNotice(
      deselect
        ? `Seat removed for traveler ${traveler + 1}.`
        : `Seat ${id} selected for traveler ${traveler + 1}. ${seat.priceCents ? `${money(seat.priceCents)} extra.` : "Included in the fare."}`,
    );
    if (!deselect) {
      const next = draft.seats.findIndex(
        (value, index) => index !== traveler && !value,
      );
      if (next !== -1) setTraveler(next);
    }
  }
  return (
    <section className="booking-section seat-section">
      <div className="booking-section-heading">
        <span className="section-icon">
          <Icon name="seat" size={22} />
        </span>
        <div>
          <h2>A little room to yourself.</h2>
          <p>Choose a seat for each traveler. Window views encouraged.</p>
        </div>
      </div>
      <div
        className="traveler-tabs"
        role="group"
        aria-label="Choose traveler for seat selection"
      >
        {draft.seats.map((seat, index) => (
          <button
            key={index}
            aria-pressed={traveler === index}
            onClick={() => setTraveler(index)}
          >
            <Icon name="user" size={15} />
            <span>Traveler {index + 1}</span>
            <strong>{seat ?? "Choose seat"}</strong>
          </button>
        ))}
      </div>
      <div className="seat-legend">
        <span>
          <i />
          Available
        </span>
        <span>
          <i className="legend-premium" />
          Extra comfort
        </span>
        <span>
          <i className="legend-selected" />
          Selected
        </span>
        <span>
          <i className="legend-occupied" />
          Occupied
        </span>
      </div>
      <div className="seat-map-layout">
        <div className="plane-cabin">
          <div className="plane-nose">
            <svg viewBox="0 0 220 90" aria-hidden="true">
              <path
                d="M28 84C30 32 67 7 110 7s80 25 82 77"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m73 41 14-10h46l14 10-6 14H79l-6-14Z"
                fill="currentColor"
                opacity=".3"
              />
            </svg>
            <span>FRONT OF AIRCRAFT</span>
          </div>
          <div className="seat-column-labels" aria-hidden="true">
            <span />
            <span>A</span>
            <span>B</span>
            <span>C</span>
            <span>D</span>
            <span>E</span>
            <span>F</span>
          </div>
          <div
            className="seat-grid"
            role="grid"
            aria-label="Aircraft seats"
            aria-rowcount={14}
            aria-colcount={7}
          >
            {Array.from({ length: 14 }, (_, rowIndex) => (
              <div
                className={`seat-row ${rowIndex === 7 ? "exit-row" : ""}`}
                role="row"
                aria-rowindex={rowIndex + 1}
                key={rowIndex}
              >
                <span
                  className="seat-row-number"
                  role="rowheader"
                  aria-colindex={1}
                >
                  {rowIndex + 1}
                </span>
                {seats.slice(rowIndex * 6, rowIndex * 6 + 6).map((seat) => {
                  const index = rowIndex * 6 + seat.column;
                  const owner = draft.seats.indexOf(seat.id);
                  return (
                    <div
                      role="gridcell"
                      aria-colindex={seat.column + 2}
                      className={seat.column === 3 ? "aisle-seat" : ""}
                      key={seat.id}
                    >
                      <button
                        ref={(element) => {
                          buttons.current[index] = element;
                        }}
                        className={`seat ${seat.premium ? "seat-premium" : ""} ${seat.occupied ? "seat-occupied" : ""} ${owner !== -1 ? "seat-selected" : ""}`}
                        tabIndex={focusIndex === index ? 0 : -1}
                        onFocus={() => setFocusIndex(index)}
                        aria-disabled={seat.occupied}
                        aria-pressed={owner !== -1}
                        aria-label={`Seat ${seat.id}, ${seat.occupied ? "occupied" : owner !== -1 ? `selected for traveler ${owner + 1}` : seat.priceCents ? `extra comfort, ${money(seat.priceCents)} extra` : "available, included"}`}
                        onClick={() => select(seat.id)}
                        onKeyDown={(event) => {
                          if (
                            [
                              "ArrowUp",
                              "ArrowDown",
                              "ArrowLeft",
                              "ArrowRight",
                              "Home",
                              "End",
                            ].includes(event.key)
                          ) {
                            event.preventDefault();
                            const next = seatIndexForKey(index, event.key);
                            setFocusIndex(next);
                            buttons.current[next]?.focus();
                          }
                        }}
                      >
                        {seat.occupied ? (
                          "×"
                        ) : owner !== -1 ? (
                          <Icon name="check" size={14} />
                        ) : (
                          seat.id
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="plane-tail">
            <Icon name="plane" size={22} />
            <span>Economy · Sample seat map</span>
          </div>
        </div>
        <div className="seat-side-note">
          <span className="note-symbol">✳</span>
          <h3>
            The best seat
            <br />
            is <em>your seat.</em>
          </h3>
          <p>
            Standard seats are included. Extra comfort seats add{" "}
            {money(3500000)}, or {money(2000000)} in row 8, per traveler.
          </p>
          <p className="keyboard-tip">
            <strong>A little keyboard help</strong>Tab to the map, use arrow
            keys to move, then Enter or Space to select.
          </p>
          <div className="selected-seats">
            {draft.seats.map((seat, index) => (
              <div key={index}>
                <span>Traveler {index + 1}</span>
                <strong>{seat ?? "Not selected"}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="seat-notice" role="status" aria-live="polite">
        {notice || `Selecting for traveler ${traveler + 1}.`}
      </p>
    </section>
  );
}
