"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { COUNTRIES, countryFlag, countryName, type CurrencyCode } from "@adgenie/core";
import { fieldClass } from "@/components/auth/fields";
import { cn } from "@/lib/utils";

const PRICED: readonly string[] = ["GHS", "NGN", "XOF"] satisfies readonly CurrencyCode[];

/** "Côte d’Ivoire" should be findable by typing "cote". */
const plain = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Country picker with flags. A native select is unusable at 159 entries, so
 * this is a search field over a listbox; the popover is portalled so a card's
 * overflow cannot clip it. Currency on the right is the country's own — the
 * three with display rates are highlighted.
 */
export function CountrySelect({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Choose a country",
  clearLabel,
  className,
}: {
  id?: string;
  value: string | null;
  onChange: (code: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Adds a row that clears the answer; Settings uses "Not set". */
  clearLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedName = countryName(value);
  const selectedFlag = countryFlag(value);

  const filtered = useMemo(() => {
    const q = plain(query.trim());
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (country) =>
        plain(country.name).includes(q) ||
        country.code.toLowerCase() === q ||
        country.currency.toLowerCase() === q
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const option = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      const index = COUNTRIES.findIndex((country) => country.code === value);
      setActive(index >= 0 ? index : 0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function choose(code: string | null) {
    onChange(code);
    setOpen(false);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(filtered.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const country = filtered[active];
      if (country) choose(country.code);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            fieldClass,
            "flex items-center gap-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {selectedFlag ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote SVG flags; next/image cannot optimise SVG without dangerouslyAllowSVG
            <img
              src={selectedFlag}
              alt=""
              loading="lazy"
              className="h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-white/10"
            />
          ) : (
            <span className="h-4 w-6 shrink-0 rounded-[2px] bg-white/5 ring-1 ring-white/10" />
          )}
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-white/25")}>
            {selectedName ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          style={{ width: "var(--radix-popover-trigger-width)", minWidth: 260 }}
          className="z-[80] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0a0d1c] shadow-2xl shadow-black/60"
        >
          <div className="flex items-center gap-2 border-b border-white/8 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                filtered[active] ? `${listId}-${filtered[active].code}` : undefined
              }
              placeholder="Search country"
              className="h-10 w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/25"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-white/30 transition-colors hover:text-white/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Countries"
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {clearLabel ? (
              <li role="option" aria-selected={!value}>
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                    value ? "text-white/50 hover:bg-white/[0.06]" : "bg-white/[0.06] text-white"
                  )}
                >
                  <span className="h-4 w-6 shrink-0 rounded-[2px] bg-white/5 ring-1 ring-white/10" />
                  <span className="flex-1">{clearLabel}</span>
                  {!value ? <Check className="h-3.5 w-3.5 text-amber-300" /> : null}
                </button>
              </li>
            ) : null}

            {filtered.map((country, index) => (
              <li
                key={country.code}
                id={`${listId}-${country.code}`}
                role="option"
                aria-selected={country.code === value}
                data-index={index}
              >
                <button
                  type="button"
                  onClick={() => choose(country.code)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    country.code === value
                      ? "bg-amber-500/10 text-white"
                      : index === active
                        ? "bg-white/[0.06] text-white/85"
                        : "text-white/70"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote SVG flags; next/image cannot optimise SVG without dangerouslyAllowSVG */}
                  <img
                    src={country.flag}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                    className="h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-white/10"
                  />
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                      PRICED.includes(country.currency) ? "text-amber-300/70" : "text-white/25"
                    )}
                  >
                    {country.currency}
                  </span>
                  {country.code === value ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  ) : null}
                </button>
              </li>
            ))}

            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-white/35">
                No country matches “{query.trim()}”.
              </li>
            ) : null}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
