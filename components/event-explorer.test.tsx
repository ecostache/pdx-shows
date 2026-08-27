// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventExplorer } from "./event-explorer";

const events = [
  { date: "2026-08-05", venue: "Past Venue", title: "Past Show" },
  { date: "2026-08-06", venue: "Holocene", title: "Today", url: "https://example.com/today" },
  { date: "2026-08-07", venue: "Wonder Ballroom", title: "Tomorrow" },
  { date: "2026-08-08", venue: "Holocene", title: "Later" },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-06T18:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EventExplorer", () => {
  it("refreshes a statically rendered date in the browser", () => {
    vi.setSystemTime(new Date("2026-08-07T18:00:00Z"));
    render(<EventExplorer events={events} today="2026-08-06" />);

    expect(screen.getByText("Today")).toBeTruthy();
    act(() => vi.advanceTimersByTime(0));

    expect(screen.queryByText("Today")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    expect(
      (screen.getByRole("button", { name: /Thursday, August 6/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("opens an accessible date picker from the date filter", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByRole("button", { name: /Dates, All upcoming/ });

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Choose a show date or range" })).toBeTruthy();
  });

  it("dismisses the date and venue filters", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });

    fireEvent.click(dateTrigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(dateTrigger);

    fireEvent.click(dateTrigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();

    const summary = screen.getByText("All venues").closest("summary") as HTMLElement;
    const filter = summary.closest("details") as HTMLDetailsElement;

    fireEvent.click(summary);
    expect(filter.open).toBe(true);
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(filter.open).toBe(false);
    expect(document.activeElement).toBe(summary);

    fireEvent.click(summary);
    fireEvent.pointerDown(document.body);
    expect(filter.open).toBe(false);
  });

  it("filters instantly by one date or an inclusive reverse-selected range", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);

    expect(screen.queryByText("Past Show")).toBeNull();
    expect(screen.getByRole("link", { name: /Today/ }).getAttribute("href")).toBe(
      "https://example.com/today",
    );

    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    fireEvent.click(screen.getByRole("button", { name: /Saturday, August 8/ }));

    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.queryByText("Tomorrow")).toBeNull();
    expect(screen.getByText("Later")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dates, Aug 8, 2026/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Friday, August 7/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aug 7, 2026 – Aug 8, 2026/ })).toBeTruthy();

    fireEvent.click(screen.getByText("All venues"));
    fireEvent.click(screen.getByLabelText("Holocene"));

    expect(screen.getByText("Later")).toBeTruthy();
    expect(screen.queryByText("Tomorrow")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      (screen.getByText("All venues").closest("details") as HTMLDetailsElement).open,
    ).toBe(false);
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
  });

  it("keeps a one-day selection when dismissed and starts fresh when reopened", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);

    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    fireEvent.click(screen.getByRole("button", { name: /Friday, August 7/ }));
    fireEvent.pointerDown(document.body);

    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.queryByText("Later")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Dates, Aug 7, 2026/ }));
    fireEvent.click(screen.getByRole("button", { name: /Saturday, August 8/ }));
    fireEvent.pointerDown(document.body);

    expect(screen.queryByText("Tomorrow")).toBeNull();
    expect(screen.getByText("Later")).toBeTruthy();
  });
});
