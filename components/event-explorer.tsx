"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { DayPicker, TZDate, type DateRange } from "react-day-picker";
import {
  filterEvents,
  formatEventDate,
  portlandDate,
  type DateSelection,
  type ShowEvent,
} from "@/lib/events";

interface EventExplorerProps {
  events: ShowEvent[];
  today: string;
}

const PORTLAND_TIME_ZONE = "America/Los_Angeles";

function calendarDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new TZDate(year, month - 1, day, PORTLAND_TIME_ZONE);
}

function dateOnly(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PORTLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatCompactDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateSelection(selection?: DateSelection): string {
  if (!selection) return "All upcoming";
  if (selection.from === selection.to) return formatCompactDate(selection.from);
  return `${formatCompactDate(selection.from)} – ${formatCompactDate(selection.to)}`;
}

export function EventExplorer({ events, today }: EventExplorerProps) {
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const venueFilterRef = useRef<HTMLDetailsElement>(null);
  const [currentDate, setCurrentDate] = useState(today);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<DateSelection>();
  const [rangeAnchor, setRangeAnchor] = useState<string>();
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  useEffect(() => {
    function refreshCurrentDate() {
      const nextDate = portlandDate();
      setCurrentDate((date) => (nextDate > date ? nextDate : date));
      setSelectedDates((selection) => {
        if (!selection || selection.from >= nextDate) return selection;
        if (selection.to < nextDate) return undefined;
        return { from: nextDate, to: selection.to };
      });
      setRangeAnchor((anchor) => (anchor && anchor < nextDate ? undefined : anchor));
    }

    const initialTimer = window.setTimeout(refreshCurrentDate, 0);
    const interval = window.setInterval(refreshCurrentDate, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function closeOpenFilters(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;

      const venueFilter = venueFilterRef.current;
      if (venueFilter?.open && !venueFilter.contains(event.target)) venueFilter.open = false;

      const dateFilter = dateFilterRef.current;
      if (dateFilter && !dateFilter.contains(event.target)) {
        setDatePickerOpen(false);
        setRangeAnchor(undefined);
      }
    }

    document.addEventListener("pointerdown", closeOpenFilters);
    return () => document.removeEventListener("pointerdown", closeOpenFilters);
  }, []);

  const venues = useMemo(
    () => [...new Set(events.map((event) => event.venue))].sort((a, b) => a.localeCompare(b)),
    [events],
  );
  const visibleEvents = useMemo(
    () => filterEvents(events, selectedVenues, currentDate, selectedDates),
    [currentDate, events, selectedDates, selectedVenues],
  );
  const groups = useMemo(
    () =>
      Object.entries(
        visibleEvents.reduce<Record<string, ShowEvent[]>>((result, event) => {
          (result[event.date] ??= []).push(event);
          return result;
        }, {}),
      ),
    [visibleEvents],
  );

  function toggleVenue(venue: string) {
    setSelectedVenues((current) => {
      const next = new Set(current);
      if (next.has(venue)) next.delete(venue);
      else next.add(venue);
      return next;
    });
  }

  function clearFilters() {
    setSelectedDates(undefined);
    setRangeAnchor(undefined);
    setDatePickerOpen(false);
    setSelectedVenues(new Set());
    if (venueFilterRef.current) venueFilterRef.current.open = false;
  }

  function toggleDatePicker() {
    const opening = !datePickerOpen;
    if (opening && venueFilterRef.current) venueFilterRef.current.open = false;
    setRangeAnchor(undefined);
    setDatePickerOpen(opening);
  }

  function closeDatePicker(restoreFocus = true) {
    setDatePickerOpen(false);
    setRangeAnchor(undefined);
    if (restoreFocus) dateTriggerRef.current?.focus();
  }

  function selectDate(_: DateRange | undefined, triggerDate: Date) {
    const clickedDate = dateOnly(triggerDate);
    if (clickedDate < currentDate) return;

    if (!rangeAnchor) {
      setSelectedDates({ from: clickedDate, to: clickedDate });
      setRangeAnchor(clickedDate);
      return;
    }

    setSelectedDates({
      from: clickedDate < rangeAnchor ? clickedDate : rangeAnchor,
      to: clickedDate < rangeAnchor ? rangeAnchor : clickedDate,
    });
    closeDatePicker();
  }

  function closeFilterOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    if (datePickerOpen) {
      closeDatePicker();
      return;
    }

    const filter = venueFilterRef.current;
    if (!filter) return;
    filter.open = false;
    filter.querySelector("summary")?.focus();
  }

  const calendarSelection: DateRange | undefined = selectedDates
    ? {
        from: calendarDate(selectedDates.from),
        to: rangeAnchor ? undefined : calendarDate(selectedDates.to),
      }
    : undefined;
  const hasFilters = selectedDates !== undefined || selectedVenues.size > 0;
  const venueSummary =
    selectedVenues.size === 0
      ? "All venues"
      : `${selectedVenues.size} venue${selectedVenues.size === 1 ? "" : "s"}`;

  return (
    <section className="event-explorer" aria-label="Upcoming shows">
      <div className="filters">
        <div ref={dateFilterRef} className={`date-filter${datePickerOpen ? " is-open" : ""}`}>
          <button
            ref={dateTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={datePickerOpen}
            aria-controls="date-picker"
            aria-label={`Dates, ${formatDateSelection(selectedDates)}`}
            onClick={toggleDatePicker}
          >
            <span>Dates</span>
            <strong aria-live="polite">{formatDateSelection(selectedDates)}</strong>
          </button>

          {datePickerOpen ? (
            <div className="date-picker-popover" onKeyDown={closeFilterOnEscape}>
              <DayPicker
                id="date-picker"
                mode="range"
                role="dialog"
                aria-label="Choose a show date or range"
                autoFocus
                navLayout="after"
                timeZone={PORTLAND_TIME_ZONE}
                noonSafe
                today={calendarDate(currentDate)}
                startMonth={calendarDate(currentDate)}
                defaultMonth={calendarSelection?.from ?? calendarDate(currentDate)}
                disabled={{ before: calendarDate(currentDate) }}
                selected={calendarSelection}
                onSelect={selectDate}
              />
              <p className="sr-only" aria-live="polite">
                {rangeAnchor
                  ? `${formatCompactDate(rangeAnchor)} selected. Choose another date for a range, or finish for one day.`
                  : "Choose one date, or choose a second date for a range."}
              </p>
            </div>
          ) : null}
        </div>

        <details
          ref={venueFilterRef}
          className="venue-filter"
          onKeyDown={closeFilterOnEscape}
          onToggle={(event) => {
            if (event.currentTarget.open) {
              setDatePickerOpen(false);
              setRangeAnchor(undefined);
            }
          }}
        >
          <summary>
            <span>Venues</span>
            <strong aria-live="polite">{venueSummary}</strong>
          </summary>
          <fieldset>
            <legend className="sr-only">Filter by venue</legend>
            {venues.map((venue) => (
              <label key={venue}>
                <input
                  type="checkbox"
                  checked={selectedVenues.has(venue)}
                  onChange={() => toggleVenue(venue)}
                />
                <span>{venue}</span>
              </label>
            ))}
          </fieldset>
        </details>

        <button type="button" className="clear-button" onClick={clearFilters} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>

      {groups.length > 0 ? (
        <div className="event-groups">
          {groups.map(([date, dateEvents]) => (
            <section className="event-group" key={date}>
              <h2>{formatEventDate(date)}</h2>
              <ul>
                {dateEvents.map((event) => {
                  const key = `${event.date}:${event.venue}:${event.title}`;
                  return (
                    <li key={key}>
                      {event.url ? (
                        <a className="event-link" href={event.url} target="_blank" rel="noreferrer">
                          <span>
                            <span className="event-title">{event.title}</span>
                            <span className="venue">{event.venue}</span>
                            <span className="sr-only"> (opens in a new tab)</span>
                          </span>
                          <span className="arrow" aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <div className="event-content">
                          <div>
                            <p className="event-title">{event.title}</p>
                            <p className="venue">{event.venue}</p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No shows found</h2>
          <p>Try an earlier date or a few more venues.</p>
          {hasFilters ? <button type="button" onClick={clearFilters}>Show everything</button> : null}
        </div>
      )}
    </section>
  );
}
