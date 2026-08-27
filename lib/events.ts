export interface ShowEvent {
  date: string;
  venue: string;
  title: string;
  url?: string;
}

export interface DateSelection {
  from: string;
  to: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function parseEvents(value: unknown): ShowEvent[] {
  if (!Array.isArray(value)) {
    throw new Error("Event data must be an array.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Event ${index + 1} must be an object.`);
    }

    const event = item as Record<string, unknown>;
    const date = typeof event.date === "string" ? event.date : "";
    const venue = typeof event.venue === "string" ? event.venue.trim() : "";
    const title = typeof event.title === "string" ? event.title.trim() : "";
    let url: string | undefined;
    if (event.url !== undefined) {
      if (typeof event.url !== "string" || !event.url.trim()) {
        throw new Error(`Event ${index + 1} has an invalid URL.`);
      }
      url = event.url.trim();
    }

    if (!isDateOnly(date)) {
      throw new Error(`Event ${index + 1} has an invalid date: ${date || "(missing)"}.`);
    }
    if (!venue) throw new Error(`Event ${index + 1} is missing a venue.`);
    if (!title) throw new Error(`Event ${index + 1} is missing a title.`);
    if (url && !isHttpUrl(url)) {
      throw new Error(`Event ${index + 1} has an invalid URL: ${url}.`);
    }

    return { date, venue, title, ...(url ? { url } : {}) };
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function portlandDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function filterEvents(
  events: ShowEvent[],
  selectedVenues: ReadonlySet<string>,
  minimumDate: string,
  selectedDates?: DateSelection,
): ShowEvent[] {
  return events.filter(
    (event) =>
      event.date >= minimumDate &&
      (!selectedDates ||
        (event.date >= selectedDates.from && event.date <= selectedDates.to)) &&
      (selectedVenues.size === 0 || selectedVenues.has(event.venue)),
  );
}

export function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
