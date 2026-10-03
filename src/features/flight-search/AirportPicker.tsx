"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { airports, getAirport } from "@/data/airports";
import Icon from "@/components/Icon";

export default function AirportPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const airport = getAirport(value);
  const options = airports.filter((item) =>
    `${item.city} ${item.code} ${item.name} ${item.country}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function choose(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            options.length - 1,
            index + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (options[active]) choose(options[active].code);
    }
  }
  return (
    <div
      className="airport-field search-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="field-value">
        <Icon name="plane" size={17} />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && options[active] ? `${id}-option-${active}` : undefined
          }
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          placeholder="City or airport"
          value={open ? query : airport ? airport.city : query}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onKeyDown={keyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
            onChange("");
          }}
        />
        {airport && <span className="airport-code">{airport.code}</span>}
      </div>
      {open && (
        <ul
          id={`${id}-options`}
          role="listbox"
          aria-label={`${label} airports`}
          className="airport-options"
        >
          {options.map((item, index) => (
            <li
              key={item.code}
              role="option"
              id={`${id}-option-${index}`}
              aria-selected={item.code === value}
              className={index === active ? "option-active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item.code)}
              onMouseEnter={() => setActive(index)}
            >
              <span className="option-code">{item.code}</span>
              <div>
                <strong>{item.city}</strong>
                <span>{item.name}</span>
              </div>
              {item.code === value && <Icon name="check" size={16} />}
            </li>
          ))}
          {!options.length && (
            <li className="no-airport" role="option" aria-disabled="true">
              No matching airports. Try a city or airport code.
            </li>
          )}
        </ul>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
