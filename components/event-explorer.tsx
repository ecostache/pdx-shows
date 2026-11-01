"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { DayPicker, TZDate, type DateRange } from "react-day-picker";
import { useFilterPopovers, type OpenFilter } from "./use-filter-popovers";
import {
  filterEvents,
  formatCompactDate,
  formatEventDate,
  PORTLAND_TIME_ZONE,
  portlandDate,
  type DateSelection,
  type ShowEvent,
} from "@/lib/events";

interface EventExplorerProps {
  events: ShowEvent[];
  today: string;
}

function calendarDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new TZDate(year, month - 1, day, PORTLAND_TIME_ZONE);
}

function formatDateSelection(selection?: DateSelection): string {
  if (!selection) return "All upcoming";
  if (selection.from === selection.to) return formatCompactDate(selection.from);
  return `${formatCompactDate(selection.from)} – ${formatCompactDate(selection.to)}`;
}

export function EventExplorer({ events, today }: EventExplorerProps) {
  const filtersRef = useRef<HTMLDivElement>(null);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const venueFilterRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const datePickerOpen = openFilter === "date";
  const venuePickerOpen = openFilter === "venue";
  const [selectedDates, setSelectedDates] = useState<DateSelection>();
  const [rangeAnchor, setRangeAnchor] = useState<string>();
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  useFilterPopovers(dateFilterRef, venueFilterRef, openFilter);

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
      setSelectedDates((selection) => {
        if (!selection || selection.from >= nextDate) return selection;
        if (selection.to < nextDate) return undefined;
        return { from: nextDate, to: selection.to };
      });
      setRangeAnchor((anchor) => (anchor && anchor < nextDate ? undefined : anchor));
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

  useEffect(() => {
    if (!openFilter) return;
    const filter = (openFilter === "date" ? dateFilterRef : venueFilterRef).current;
    if (!filter) return;

    const closeOutsideFilter = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || filter.contains(event.target)) return;
      if (filter.contains(document.activeElement)) {
        filter.querySelector("button")?.focus({ preventScroll: true });
      }
      setOpenFilter(null);
      setRangeAnchor(undefined);
    };

    document.addEventListener("pointerdown", closeOutsideFilter);
    return () => document.removeEventListener("pointerdown", closeOutsideFilter);
  }, [openFilter]);

  const venues = useMemo(
    () => [...new Set(
      events
        .filter((event) => event.date >= currentDate || selectedVenues.has(event.venue))
        .map((event) => event.venue),
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
    setRangeAnchor(undefined);
    setOpenFilter(null);
    setSelectedVenues(new Set());
    dateTriggerRef.current?.focus();
  }

  function toggleFilter(filter: Exclude<OpenFilter, null>) {
    if (filter === "date" && !datePickerOpen) {
      setCalendarMonth(selectedDates?.from ?? currentDate);
    }
    setRangeAnchor(undefined);
    setOpenFilter((current) => current === filter ? null : filter);
  }

  function closeFilter(restoreFocus = true) {
    setOpenFilter(null);
    setRangeAnchor(undefined);
    if (restoreFocus && openFilter) {
      const filter = (openFilter === "date" ? dateFilterRef : venueFilterRef).current;
      filter?.querySelector("button")?.focus({ preventScroll: true });
    }
  }

  function selectDate(_: DateRange | undefined, triggerDate: Date) {
    const clickedDate = portlandDate(triggerDate);
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
    closeFilter();
  }

  function closeFilterOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || !openFilter) return;

    event.preventDefault();
    closeFilter();
  }

  function closeFilterOnBlur(event: FocusEvent<HTMLElement>) {
    const filter = (openFilter === "date" ? dateFilterRef : venueFilterRef).current;
    if (!openFilter || event.currentTarget !== filter) return;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;

    closeFilter(false);
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
      <div ref={filtersRef} className="filters">
        <div
          ref={dateFilterRef}
          onKeyDown={closeFilterOnEscape}
          onBlur={closeFilterOnBlur}
          className={`date-filter${datePickerOpen ? " is-open" : ""}`}
        >
          <button
            ref={dateTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={datePickerOpen}
            aria-controls="date-picker"
            aria-label={`Dates, ${formatDateSelection(selectedDates)}`}
            onClick={() => toggleFilter("date")}
          >
            <span>Dates</span>
            <strong aria-live="polite">{formatDateSelection(selectedDates)}</strong>
          </button>

          {datePickerOpen ? (
            <div
              className="date-picker-popover"
              id="date-picker"
              role="dialog"
              aria-label="Choose a show date or range"
              aria-describedby="date-picker-help"
            >
              <DayPicker
                mode="range"
                autoFocus
                navLayout="after"
                timeZone={PORTLAND_TIME_ZONE}
                noonSafe
                today={calendarDate(currentDate)}
                startMonth={calendarDate(currentDate)}
                month={calendarDate(calendarMonth < currentDate ? currentDate : calendarMonth)}
                onMonthChange={(month) => setCalendarMonth(portlandDate(month))}
                disabled={{ before: calendarDate(currentDate) }}
                selected={calendarSelection}
                onSelect={selectDate}
              />
              <p id="date-picker-help" className="calendar-help" aria-live="polite">
                {rangeAnchor
                  ? `${formatCompactDate(rangeAnchor)} selected. Choose another date for a range, or choose the same date again for one day.`
                  : "Choose a date, then an end date for a range. Choose the same date twice for one day."}
              </p>
            </div>
          ) : null}
        </div>

        <div
          ref={venueFilterRef}
          className={`venue-filter${venuePickerOpen ? " is-open" : ""}`}
          onKeyDown={closeFilterOnEscape}
          onBlur={closeFilterOnBlur}
        >
          <button
            type="button"
            aria-expanded={venuePickerOpen}
            aria-controls="venue-picker"
            aria-label={`Venues, ${venueSummary}`}
            onClick={() => toggleFilter("venue")}
          >
            <span>Venues</span>
            <strong aria-live="polite">{venueSummary}</strong>
          </button>
          <fieldset id="venue-picker" hidden={!venuePickerOpen}>
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
          <p>{hasFilters ? "Try different dates or venues." : "Check back soon for upcoming shows."}</p>
          {hasFilters ? <button type="button" onClick={clearFilters}>Show everything</button> : null}
        </div>
      )}
    </section>
  );
}
