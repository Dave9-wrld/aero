"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { money } from "@/lib/format";
import type { OfferSeatMap, SeatAssignment, SeatElement } from "./types";

export default function SandboxSeatMap({
  map,
  passengerId,
  passengerIndex,
  passengerIds,
  currency,
  assignments,
  disabled,
  onSelect,
}: {
  map: OfferSeatMap;
  passengerId: string;
  passengerIndex: number;
  passengerIds: string[];
  currency: string;
  assignments: SeatAssignment[];
  disabled: boolean;
  onSelect: (seat: SeatElement, map: OfferSeatMap) => void;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const positions = map.cabins.flatMap((cabin, cabinIndex) =>
    cabin.rows.flatMap((row, rowIndex) =>
      row.sections.flatMap((section, sectionIndex) =>
        section.flatMap((element, elementIndex) =>
          element.type === "seat"
            ? [
                {
                  id: `${cabinIndex}-${rowIndex}-${sectionIndex}-${elementIndex}`,
                  cabinIndex,
                  rowIndex,
                  column: sectionIndex * 100 + elementIndex,
                },
              ]
            : [],
        ),
      ),
    ),
  );
  const first = positions[0]?.id;
  function move(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    const current = positions.find((item) => item.id === id)!;
    const inRow = positions.filter(
      (item) =>
        item.cabinIndex === current.cabinIndex &&
        item.rowIndex === current.rowIndex,
    );
    const index = inRow.findIndex((item) => item.id === id);
    let next = current;
    if (event.key === "ArrowLeft") next = inRow[Math.max(0, index - 1)];
    if (event.key === "ArrowRight")
      next = inRow[Math.min(inRow.length - 1, index + 1)];
    if (event.key === "Home") next = inRow[0];
    if (event.key === "End") next = inRow[inRow.length - 1];
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const seatRows = [
        ...new Set(
          positions
            .filter((item) => item.cabinIndex === current.cabinIndex)
            .map((item) => item.rowIndex),
        ),
      ];
      const targetRow =
        seatRows[
          seatRows.indexOf(current.rowIndex) +
            (event.key === "ArrowUp" ? -1 : 1)
        ];
      const candidates = positions.filter(
        (item) =>
          item.cabinIndex === current.cabinIndex && item.rowIndex === targetRow,
      );
      next =
        candidates.sort(
          (a, b) =>
            Math.abs(a.column - current.column) -
            Math.abs(b.column - current.column),
        )[0] ?? current;
    }
    buttons.current.get(next.id)?.focus();
  }
  return (
    <div
      className="sandbox-map-scroll"
      role="region"
      tabIndex={0}
      aria-label="Aircraft seat map, scroll horizontally on smaller screens"
    >
      <div className="sandbox-aircraft">
        <div className="sandbox-cabin-front">
          <span>FRONT OF AIRCRAFT</span>
          <p>Viewing seats for traveler {passengerIndex + 1}</p>
        </div>
        {map.cabins.map((cabin, cabinIndex) => {
          const sectionCount = Math.max(
            0,
            ...cabin.rows.map((row) => row.sections.length),
          );
          const widths = Array.from(
            { length: sectionCount },
            (_, sectionIndex) =>
              Math.max(
                1,
                ...cabin.rows.map(
                  (row) => row.sections[sectionIndex]?.length ?? 0,
                ),
              ),
          );
          return (
            <section
              className="sandbox-cabin"
              key={cabinIndex}
              aria-label={`Cabin ${cabinIndex + 1}, deck ${cabin.deck + 1}`}
            >
              <p className="sandbox-cabin-label">
                Cabin {cabinIndex + 1} · Deck {cabin.deck + 1}
              </p>
              {cabin.rows.map((row, rowIndex) => (
                <div className="sandbox-seat-row" key={rowIndex}>
                  {widths.map((width, sectionIndex) => (
                    <div
                      className="sandbox-seat-section"
                      key={sectionIndex}
                      style={{ gridTemplateColumns: `repeat(${width}, 44px)` }}
                    >
                      {(row.sections[sectionIndex] ?? []).map(
                        (element, elementIndex) => {
                          if (element.type !== "seat")
                            return (
                              <span
                                className={`sandbox-seat-feature ${["empty", "bassinet"].includes(element.type) ? "feature-small" : ""}`}
                                style={
                                  !["empty", "bassinet"].includes(
                                    element.type,
                                  ) && row.sections[sectionIndex].length === 1
                                    ? { gridColumn: "1 / -1" }
                                    : undefined
                                }
                                key={elementIndex}
                                title={element.label}
                              >
                                {element.type === "empty" ? "" : element.label}
                              </span>
                            );
                          const id = `${cabinIndex}-${rowIndex}-${sectionIndex}-${elementIndex}`;
                          const service = element.services.find(
                            (item) => item.passengerId === passengerId,
                          );
                          const assigned = assignments.find(
                            (item) =>
                              item.segmentId === map.segmentId &&
                              item.seat === element.label,
                          );
                          const available = !!service && !disabled;
                          const state = assigned
                            ? `selected for traveler ${passengerIds.indexOf(assigned.passengerId) + 1}`
                            : available
                              ? service.priceCents
                                ? `${money(service.priceCents, currency)} extra`
                                : "free"
                              : "unavailable for this traveler";
                          return (
                            <button
                              key={id}
                              ref={(button) => {
                                if (button) buttons.current.set(id, button);
                                else buttons.current.delete(id);
                              }}
                              tabIndex={(focused ?? first) === id ? 0 : -1}
                              onFocus={() => setFocused(id)}
                              className={`sandbox-seat ${!available ? "sandbox-seat-unavailable" : service.priceCents ? "sandbox-seat-paid" : ""} ${assigned ? "sandbox-seat-selected" : ""}`}
                              aria-pressed={!!assigned}
                              aria-disabled={!available}
                              aria-label={`Seat ${element.label}, ${state}${element.disclosures.length ? `. ${element.disclosures.join(". ")}` : ""}`}
                              title={element.disclosures.join(". ")}
                              onKeyDown={(event) => move(event, id)}
                              onClick={() => {
                                if (available) onSelect(element, map);
                              }}
                            >
                              <span>{element.label}</span>
                              {service && (
                                <small>
                                  {service.priceCents
                                    ? money(service.priceCents, currency)
                                    : "Free"}
                                </small>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
