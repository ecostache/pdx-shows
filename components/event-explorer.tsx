"use client";

import {
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { DateCalendar } from "./date-calendar";
import { useFilterPopover } from "./use-filter-popover";
import {
  filterEvents,
  upcomingDateSelection,
  formatCompactDate,
  formatEventDate,
  portlandDate,
  type DateSelection,
  type ShowEvent,
} from "@/lib/events";

interface EventExplorerProps {
  events: ShowEvent[];
  today: string;
}

function formatDateSelection(selection?: DateSelection): string {
  if (!selection) return "All upcoming";
  if (selection.from === selection.to) return formatCompactDate(selection.from);
  return `${formatCompactDate(selection.from)} – ${formatCompactDate(selection.to)}`;
}

export function EventExplorer({ events, today }: EventExplorerProps) {
  const filtersRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [currentDate, setCurrentDate] = useState(today);
  const [openFilter, setOpenFilter] = useState<"date" | "venue" | null>(null);
  const datePickerOpen = openFilter === "date";
  const venuePickerOpen = openFilter === "venue";
  const [dateSelection, setSelectedDates] = useState<DateSelection>();
  const selectedDates = upcomingDateSelection(dateSelection, currentDate);
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  const dismissFilter = useCallback(() => setOpenFilter(null), []);
  const {
    filterProps: dateFilterProps, triggerRef: dateTriggerRef, panelRef: datePanelRef, close: closeDatePicker,
  } = useFilterPopover<HTMLDivElement>(datePickerOpen, dismissFilter, "date");
  const {
    filterProps: venueFilterProps, triggerRef: venueTriggerRef, panelRef: venuePanelRef,
  } = useFilterPopover<HTMLFieldSetElement>(venuePickerOpen, dismissFilter, "venue");

  useEffect(() => {
    const filters = filtersRef.current;
    const explorer = filters?.parentElement;
    if (!filters || !explorer) return;

    const updateFiltersHeight = () => {
      explorer.style.setProperty("--filters-height", `${filters.getBoundingClientRect().height}px`);
    };

    updateFiltersHeight();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateFiltersHeight);
    observer?.observe(filters);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    function refreshCurrentDate() {
      const nextDate = portlandDate();
      setCurrentDate((date) => (nextDate > date ? nextDate : date));
    }

    const initialTimer = window.setTimeout(refreshCurrentDate, 0);
    const interval = window.setInterval(refreshCurrentDate, 60_000);
    function refreshVisibleDate() {
      if (document.visibilityState === "visible") refreshCurrentDate();
    }
    document.addEventListener("visibilitychange", refreshVisibleDate);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisibleDate);
    };
  }, []);

  const venues = useMemo(
    () => [...new Set(
      events
        .filter((event) => event.date >= currentDate)
        .map((event) => event.venue)
        .concat([...selectedVenues]),
    )].sort((a, b) => a.localeCompare(b)),
    [currentDate, events, selectedVenues],
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
      ).sort(([a], [b]) => a.localeCompare(b)),
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
    setOpenFilter(null);
    setSelectedVenues(new Set());
    dateTriggerRef.current?.focus();
  }

  function toggleFilter(filter: "date" | "venue") {
    setOpenFilter((current) => current === filter ? null : filter);
  }

  const hasFilters = selectedDates !== undefined || selectedVenues.size > 0;
  const venueSummary =
    selectedVenues.size === 0
      ? "All venues"
      : `${selectedVenues.size} venue${selectedVenues.size === 1 ? "" : "s"}`;

  return (
    <section className="event-explorer" aria-label="Upcoming shows">
      <div ref={filtersRef} className="filters">
        <div
          {...dateFilterProps}
          className={`date-filter${datePickerOpen ? " is-open" : ""}`}
        >
          <button
            ref={dateTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={datePickerOpen}
            aria-controls={`${id}-date-picker`}
            aria-label={`Dates, ${formatDateSelection(selectedDates)}`}
            onClick={() => toggleFilter("date")}
          >
            <span>Dates</span>
            <strong aria-live="polite">{formatDateSelection(selectedDates)}</strong>
          </button>

          {datePickerOpen ? (
            <div
              ref={datePanelRef}
              className="date-picker-popover"
              id={`${id}-date-picker`}
              role="dialog"
              aria-label="Choose a show date or range"
              aria-describedby={`${id}-date-picker-help`}
            >
              <DateCalendar
                today={currentDate}
                selection={selectedDates}
                helpId={`${id}-date-picker-help`}
                onSelect={setSelectedDates}
                onComplete={closeDatePicker}
              />
            </div>
          ) : null}
        </div>

        <div
          {...venueFilterProps}
          className={`venue-filter${venuePickerOpen ? " is-open" : ""}`}
        >
          <button
            type="button"
            ref={venueTriggerRef}
            aria-expanded={venuePickerOpen}
            aria-controls={`${id}-venue-picker`}
            aria-label={`Venues, ${venueSummary}`}
            onClick={() => toggleFilter("venue")}
          >
            <span>Venues</span>
            <strong aria-live="polite">{venueSummary}</strong>
          </button>
          <fieldset ref={venuePanelRef} id={`${id}-venue-picker`} hidden={!venuePickerOpen}>
            <legend className="sr-only">Filter by venue</legend>
            {venues.map((venue) => (
              <label
                key={venue}
                onPointerDown={(event) => {
                  if (event.button !== 0 || event.target instanceof HTMLInputElement) return;
                  // Keep focus inside the filter until the label activates its checkbox.
                  event.preventDefault();
                  event.currentTarget.querySelector("input")?.focus({ preventScroll: true });
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedVenues.has(venue)}
                  onChange={() => toggleVenue(venue)}
                />
                <span>{venue}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <button type="button" className="clear-button" onClick={clearFilters} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>

      <p className="sr-only" role="status" aria-atomic="true">
        {visibleEvents.length} {visibleEvents.length === 1 ? "show" : "shows"} found.
      </p>

      {groups.length > 0 ? (
        <div className="event-groups">
          {groups.map(([date, dateEvents]) => (
            <section className="event-group" key={date}>
              <h2>{formatEventDate(date)}</h2>
              <ul>
                {dateEvents.map((event) => {
                  const key = JSON.stringify([event.date, event.venue, event.title, event.url]);
                  const details = (
                    <span>
                      <span className="event-title">{event.title}</span>
                      <span className="venue">{event.venue}</span>
                    </span>
                  );
                  return (
                    <li key={key}>
                      {event.url ? (
                        <a className="event-link" href={event.url} target="_blank" rel="noreferrer">
                          {details}
                          <span className="sr-only"> (opens in a new tab)</span>
                          <span className="arrow" aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <div className="event-content">
                          {details}
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
          <p>{hasFilters ? "Try different dates or venues." : "Check back soon for upcoming shows."}</p>
          {hasFilters ? <button type="button" onClick={clearFilters}>Show everything</button> : null}
        </div>
      )}
    </section>
  );
}
