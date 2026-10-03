"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { todayISO } from "@/lib/format";
import AirportPicker from "./AirportPicker";
import { validateSearch, searchToParams, type SearchErrors } from "./model";
import type { SearchCriteria } from "./types";

export default function SearchForm({
  initial,
  compact = false,
  source = "sample",
}: {
  initial: SearchCriteria;
  compact?: boolean;
  source?: "sample" | "duffel";
}) {
  const [criteria, setCriteria] = useState(initial);
  const [errors, setErrors] = useState<SearchErrors>({});
  const router = useRouter();
  function submit(event: FormEvent) {
    event.preventDefault();
    const errors = validateSearch(criteria);
    setErrors(errors);
    if (Object.keys(errors).length) return;
    router.push(
      `/flights?${searchToParams(criteria)}${source === "duffel" ? "&source=duffel" : ""}`,
    );
  }
  return (
    <div className={`search-panel ${compact ? "search-panel-compact" : ""}`}>
      <div className="search-panel-top">
        <span className="trip-type">
          <Icon name="plane" size={15} />
          One way
        </span>
        <span>
          Economy <span className="middle-dot">·</span> A fresh perspective
        </span>
      </div>
      <form className="flight-search" onSubmit={submit} noValidate>
        <AirportPicker
          label="Flying from"
          value={criteria.origin}
          onChange={(origin) => setCriteria((old) => ({ ...old, origin }))}
          error={errors.origin}
        />
        <button
          className="swap-button"
          type="button"
          aria-label="Swap departure and destination airports"
          onClick={() =>
            setCriteria((old) => ({
              ...old,
              origin: old.destination,
              destination: old.origin,
            }))
          }
        >
          <Icon name="swap" size={17} />
        </button>
        <AirportPicker
          label="Flying to"
          value={criteria.destination}
          onChange={(destination) =>
            setCriteria((old) => ({ ...old, destination }))
          }
          error={errors.destination}
        />
        <div className="search-field">
          <label htmlFor={compact ? "edit-date" : "search-date"}>
            Departure
          </label>
          <div className="field-value">
            <Icon name="calendar" size={17} />
            <input
              id={compact ? "edit-date" : "search-date"}
              type="date"
              min={todayISO()}
              value={criteria.date}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? "date-error" : undefined}
              onChange={(event) =>
                setCriteria((old) => ({ ...old, date: event.target.value }))
              }
            />
          </div>
          {errors.date && (
            <span className="field-error" id="date-error">
              {errors.date}
            </span>
          )}
        </div>
        <div className="search-field traveler-field">
          <label htmlFor={compact ? "edit-passengers" : "search-passengers"}>
            Travelers
          </label>
          <div className="field-value">
            <Icon name="user" size={17} />
            <select
              id={compact ? "edit-passengers" : "search-passengers"}
              value={criteria.passengers}
              onChange={(event) =>
                setCriteria((old) => ({
                  ...old,
                  passengers: Number(event.target.value),
                }))
              }
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count} adult{count > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          {errors.passengers && (
            <span className="field-error">{errors.passengers}</span>
          )}
        </div>
        <button className="button button-primary search-submit" type="submit">
          <Icon name="search" size={18} />
          Find flights
        </button>
        {Object.keys(errors).length > 0 && (
          <p className="search-error-summary" role="alert">
            Please check the highlighted search details.
          </p>
        )}
      </form>
    </div>
  );
}
