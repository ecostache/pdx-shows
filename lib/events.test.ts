import { describe, expect, it } from "vitest";
import {
  filterEvents,
  formatEventDate,
  isDateOnly,
  parseEvents,
  portlandDate,
} from "./events";

describe("event data", () => {
  it("keeps calendar dates valid and stable at Portland timezone boundaries", () => {
    expect(isDateOnly("2026-02-28")).toBe(true);
    expect(isDateOnly("2026-02-29")).toBe(false);
    expect(isDateOnly("2026-08-06T00:00:00")).toBe(false);
    expect(() => parseEvents([{ date: "2026-13-01", venue: "A", title: "B" }])).toThrow(
      "invalid date",
    );
    expect(() =>
      parseEvents([{ date: "2026-08-07", venue: "A", title: "B", url: "https://" }]),
    ).toThrow("invalid URL");
    expect(() =>
      parseEvents([{ date: "2026-08-07", venue: "A", title: "B", url: 42 }]),
    ).toThrow("invalid URL");
    expect(portlandDate(new Date("2026-08-07T06:30:00Z"))).toBe("2026-08-06");
    expect(portlandDate(new Date("2026-08-07T07:30:00Z"))).toBe("2026-08-07");
    expect(formatEventDate("2026-08-07")).toBe("Friday, August 7, 2026");
  });

  it("filters exact dates and inclusive ranges alongside venues", () => {
    const events = [
      { date: "2026-08-07", venue: "A", title: "First" },
      { date: "2026-08-08", venue: "B", title: "Second" },
      { date: "2026-08-09", venue: "A", title: "Third" },
    ];

    expect(
      filterEvents(events, new Set(), "2026-08-07", {
        from: "2026-08-08",
        to: "2026-08-08",
      }).map((event) => event.title),
    ).toEqual(["Second"]);
    expect(
      filterEvents(events, new Set(["A"]), "2026-08-08", {
        from: "2026-08-07",
        to: "2026-08-09",
      }).map((event) => event.title),
    ).toEqual(["Third"]);
  });
});
