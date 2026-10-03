"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { getAirport } from "@/data/airports";
import { money, prettyDate } from "@/lib/format";
import SearchForm from "@/features/flight-search/SearchForm";
import {
  searchFromParams,
  validateSearch,
  defaultSearch,
  searchToParams,
} from "@/features/flight-search/model";
import { useBooking } from "@/features/booking/BookingProvider";
import { flightProvider, airlines } from "./provider";
import { sandboxFlightProvider } from "./sandbox-provider";
import { filterFlights } from "./filter";
import FlightCard from "./FlightCard";
import type { FlightFilters, FlightOffer } from "./types";

export default function FlightResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { dispatch, ready } = useBooking();
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
          passengers: passengers ?? "1",
        }),
      ),
    [from, to, date, passengers],
  );
  const sandbox = params.get("source") === "duffel";
  const key = `${sandbox ? "duffel" : "sample"}:${searchToParams(criteria)}`;
  const errors = validateSearch(criteria);
  const invalid = Object.keys(errors).length > 0;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    status: "loading" | "done" | "error";
    offers: FlightOffer[];
    error?: string;
  }>({ key: "", status: "loading", offers: [] });
  useEffect(() => {
    if (Object.keys(validateSearch(criteria)).length) return;
    const controller = new AbortController();
    setResult({ key, status: "loading", offers: [] });
    (sandbox ? sandboxFlightProvider : flightProvider)
      .search(criteria, { signal: controller.signal })
      .then((offers) => {
        if (!controller.signal.aborted)
          setResult({ key, status: "done", offers });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            status: "error",
            offers: [],
            error: error instanceof Error ? error.message : "Please try again.",
          });
      });
    return () => controller.abort();
  }, [criteria, key, retry, sandbox]);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    router.replace(`/flights?${next}`, { scroll: false });
  }
  function resetFilters() {
    update({ nonstop: null, airlines: null, price: null, sort: null });
  }
  const requestedSort = params.get("sort");
  const price = Number(params.get("price"));
  const filters: FlightFilters = {
    nonstop: params.get("nonstop") === "1",
    airlines: (params.get("airlines") ?? "").split(",").filter(Boolean),
    maxPriceCents:
      params.has("price") && Number.isFinite(price) && price >= 0
        ? price
        : null,
    sort:
      requestedSort === "cheapest" || requestedSort === "fastest"
        ? requestedSort
        : "recommended",
  };
  const offers = result.key === key ? result.offers : [];
  const displayedAirlines = sandbox
    ? [
        ...new Map(
          offers.map((offer) => [offer.airline.id, offer.airline]),
        ).values(),
      ]
    : airlines;
  const currency = offers[0]?.currency ?? "NGN";
  const priceStep = sandbox ? 100 : 5000000;
  const visible = filterFlights(offers, filters);
  const loading = result.key !== key || result.status === "loading";
  const lowest = offers.length
    ? offers.reduce((a, b) => (a.priceCents < b.priceCents ? a : b))
    : null;
  const recommended = filterFlights(offers, {
    nonstop: false,
    airlines: [],
    maxPriceCents: null,
    sort: "recommended",
  })[0];
  const maxPrice = offers.length
    ? Math.ceil(
        Math.max(...offers.map((offer) => offer.priceCents)) / priceStep,
      ) * priceStep
    : 150000000;
  const minPrice = offers.length
    ? Math.floor(
        Math.min(...offers.map((offer) => offer.priceCents)) / priceStep,
      ) * priceStep
    : 0;
  const origin = getAirport(criteria.origin),
    destination = getAirport(criteria.destination);

  if (invalid)
    return (
      <div className="container invalid-search">
        <p className="eyebrow">LET’S GET THE DETAILS RIGHT</p>
        <h1>Where would you like to go?</h1>
        <p role="alert">{Object.values(errors).join(" ")}</p>
        <SearchForm
          initial={defaultSearch()}
          compact
          source={sandbox ? "duffel" : "sample"}
        />
      </div>
    );

  return (
    <div className="container results-page">
      <div className="breadcrumb">
        <Link href="/">Book a flight</Link>
        <Icon name="chevron" size={13} />
        <span>Choose your flight</span>
      </div>
      <div className="results-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1>
            {origin!.city} <span className="heading-arrow">↗</span>{" "}
            <em>{destination!.city}</em>
          </h1>
          <p>
            {prettyDate(criteria.date, true)}{" "}
            <span className="middle-dot">·</span> {criteria.passengers} adult
            {criteria.passengers > 1 ? "s" : ""}{" "}
            <span className="middle-dot">·</span> One way, economy
          </p>
        </div>
        <span className="sample-label">
          <span className="status-dot" />
          {sandbox ? "Duffel sandbox" : "Sample flights"}
        </span>
      </div>
      <section className="flight-source-panel" aria-label="Flight data source">
        <div>
          <strong>Choose your flight data</strong>
          <p>
            {sandbox
              ? "Explore test flights, choose seats and create a fictional booking. No real travel or payment."
              : "Explore the complete booking demo, or connect to Duffel for sandbox searches."}
          </p>
        </div>
        <div className="flight-source-buttons">
          <button
            aria-pressed={!sandbox}
            onClick={() =>
              update({ source: null, airlines: null, price: null })
            }
          >
            Sample flights
          </button>
          <button
            aria-pressed={sandbox}
            onClick={() =>
              update({ source: "duffel", airlines: null, price: null })
            }
          >
            Duffel sandbox
          </button>
          {sandbox && (
            <button
              disabled={loading}
              onClick={() => setRetry((value) => value + 1)}
            >
              Refresh offers
            </button>
          )}
        </div>
      </section>
      <details className="modify-search">
        <summary>
          <Icon name="search" size={16} />
          <span>Change your search</span>
          <Icon name="chevron" size={15} />
        </summary>
        <SearchForm
          key={key}
          initial={criteria}
          compact
          source={sandbox ? "duffel" : "sample"}
        />
      </details>
      <div className="results-layout">
        <aside className="filters-panel">
          <div className="filter-heading">
            <h2>Make it yours</h2>
            <button className="text-button" onClick={resetFilters}>
              Reset
            </button>
          </div>
          <fieldset>
            <legend>Stops</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={filters.nonstop}
                onChange={(event) =>
                  update({ nonstop: event.target.checked ? "1" : null })
                }
              />
              <span>Nonstop only</span>
            </label>
          </fieldset>
          <fieldset>
            <legend>{sandbox ? "Total trip price" : "Price per adult"}</legend>
            <div className="budget-value">
              {offers.length
                ? `Up to ${money(filters.maxPriceCents ?? maxPrice, currency)}`
                : "Available after search"}
            </div>
            <input
              className="price-range"
              aria-label={
                sandbox ? "Maximum total trip fare" : "Maximum fare per adult"
              }
              disabled={!offers.length}
              type="range"
              min={minPrice}
              max={maxPrice}
              step={priceStep}
              value={Math.max(
                minPrice,
                Math.min(maxPrice, filters.maxPriceCents ?? maxPrice),
              )}
              onChange={(event) => update({ price: event.target.value })}
            />
            <div className="range-labels">
              <span>{offers.length ? money(minPrice, currency) : "—"}</span>
              <span>{offers.length ? money(maxPrice, currency) : "—"}</span>
            </div>
          </fieldset>
          <fieldset>
            <legend>Airlines</legend>
            {displayedAirlines.map((airline) => (
              <label className="check-label" key={airline.id}>
                <input
                  type="checkbox"
                  checked={filters.airlines.includes(airline.id)}
                  onChange={(event) =>
                    update({
                      airlines:
                        (event.target.checked
                          ? [...filters.airlines, airline.id]
                          : filters.airlines.filter((id) => id !== airline.id)
                        ).join(",") || null,
                    })
                  }
                />
                <span>{airline.name}</span>
                <span
                  className="airline-dot"
                  style={{ background: airline.color }}
                />
              </label>
            ))}
          </fieldset>
          <div className="filter-note">
            <Icon name="info" size={18} />
            <p>
              {sandbox
                ? "Sandbox fares cover all travelers. Open a flight to retrieve its current fare and available seats. No real ticket is issued."
                : "A working portfolio experience with fictional airlines and sample fares."}
            </p>
          </div>
        </aside>
        <section className="results-list" aria-label="Flight results">
          <div className="sort-options">
            {[
              {
                id: "recommended",
                name: "Aero picks",
                text: "A little less compromise",
              },
              {
                id: "cheapest",
                name: "Lowest fare",
                text: lowest
                  ? `From ${money(lowest.priceCents, currency)}`
                  : "A little more to explore",
              },
              {
                id: "fastest",
                name: "Fastest",
                text: "A little more time there",
              },
            ].map((sort) => (
              <button
                key={sort.id}
                aria-pressed={filters.sort === sort.id}
                onClick={() =>
                  update({ sort: sort.id === "recommended" ? null : sort.id })
                }
              >
                <strong>{sort.name}</strong>
                <span>{sort.text}</span>
              </button>
            ))}
          </div>
          <div className="result-count" role="status" aria-live="polite">
            {loading
              ? "Finding your flights…"
              : result.status === "error"
                ? "Search unavailable"
                : `${visible.length} flight${visible.length === 1 ? "" : "s"} to consider`}
            <span>All times are local</span>
          </div>
          {loading ? (
            <div className="skeleton-list" aria-label="Loading flights">
              {[0, 1, 2].map((index) => (
                <div className="flight-skeleton" key={index}>
                  <div />
                  <div />
                  <div />
                </div>
              ))}
            </div>
          ) : result.status === "error" ? (
            <div className="inline-empty">
              <Icon name="info" size={30} />
              <h2>A small interruption.</h2>
              <p role="alert">
                {result.error ??
                  "We couldn’t load these flights. Please try again."}
              </p>
              <button
                className="button button-primary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : visible.length ? (
            visible.map((offer) => (
              <FlightCard
                key={offer.id}
                offer={offer}
                passengers={criteria.passengers}
                disabled={!ready}
                badge={
                  offer.id === recommended?.id
                    ? "Aero pick"
                    : offer.id === lowest?.id
                      ? "Lowest fare"
                      : undefined
                }
                onSelect={() => {
                  if (sandbox) {
                    const next = searchToParams(criteria);
                    next.set("offer", offer.id);
                    next.set("quoted", String(offer.priceCents));
                    next.set("currency", offer.currency);
                    router.push(`/sandbox-offer?${next}`);
                    return;
                  }
                  dispatch({ type: "start", offer, criteria });
                  router.push("/booking?step=seats");
                }}
              />
            ))
          ) : (
            <div className="inline-empty">
              <Icon name="globe" size={34} />
              <h2>
                {offers.length
                  ? "A little too specific?"
                  : sandbox
                    ? "No sandbox offers this time."
                    : "This route is still on our wish list."}
              </h2>
              <p>
                {offers.length
                  ? "Try widening your filters to see more flights."
                  : sandbox
                    ? "Try a different date or route. Test availability depends on the provider’s sandbox."
                    : "Our demo includes Lagos to London, Dubai, New York, Accra, Paris and Cape Town, plus selected routes from Abuja and Port Harcourt."}
              </p>
              {offers.length ? (
                <button
                  className="button button-primary"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  className="button button-primary"
                  href={`/flights?${searchToParams({ ...criteria, origin: "LOS", destination: "LHR" })}${sandbox ? "&source=duffel" : ""}`}
                >
                  Explore Lagos to London <Icon name="arrow" size={17} />
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
