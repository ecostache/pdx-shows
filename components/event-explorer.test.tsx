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
  vi.restoreAllMocks();
});

describe("EventExplorer", () => {
  it("orders date groups and hides venues with no upcoming events", () => {
    render(<EventExplorer events={[...events].reverse()} today="2026-08-06" />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Thursday, August 6, 2026", "Friday, August 7, 2026", "Saturday, August 8, 2026",
    ]);
    expect(screen.queryByLabelText("Past Venue")).toBeNull();
  });

  it("finishes a single date on the second click and restores focus", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByRole("button", { name: /Dates, All upcoming/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: /Friday, August 7/ }));
    fireEvent.click(screen.getByRole("button", { name: /Friday, August 7/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.queryByText("Later")).toBeNull();
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("expires past date selections when Portland crosses midnight", () => {
    vi.setSystemTime(new Date("2026-08-07T06:59:30Z"));
    render(<EventExplorer events={events} today="2026-08-06" />);
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thursday, August 6/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thursday, August 6/ }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dates, All upcoming/ })).toBeTruthy();
  });

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

  it("fits the venue menu above a low trigger and repositions it after resizing", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByText("All venues").closest("button") as HTMLElement;
    const filter = trigger.closest(".venue-filter") as HTMLDivElement;
    const panel = filter.querySelector("fieldset") as HTMLFieldSetElement;
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 300, 288, 56));
    vi.spyOn(panel, "scrollHeight", "get").mockReturnValue(800);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(568);
    const originalFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = "16px";

    try {
      fireEvent.click(trigger);
      expect(panel.style.getPropertyValue("--popover-available-height")).toBe("280px");
      expect(panel.style.getPropertyValue("--popover-top")).toBe("-288px");

      vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
      fireEvent.resize(window);
      expect(panel.style.getPropertyValue("--popover-available-height")).toBe("424px");
      expect(panel.style.getPropertyValue("--popover-top")).toBe("64px");
    } finally {
      document.documentElement.style.fontSize = originalFontSize;
    }
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

    const trigger = screen.getByText("All venues").closest("button") as HTMLElement;
    const filter = trigger.closest(".venue-filter") as HTMLDivElement;

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
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
    expect(screen.getByRole("button", { name: "Venues, All venues" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
  });

  it("closes filters when keyboard focus leaves, while allowing focus inside", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });
    const venueTrigger = screen.getByText("All venues").closest("button") as HTMLElement;

    fireEvent.click(dateTrigger);
    const date = screen.getByRole("button", { name: /Friday, August 7/ });
    act(() => date.focus());
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => venueTrigger.focus());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(venueTrigger);

    fireEvent.click(venueTrigger);
    act(() => screen.getByLabelText("Holocene").focus());
    expect(venueTrigger.getAttribute("aria-expanded")).toBe("true");
    act(() => dateTrigger.focus());
    expect(venueTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(dateTrigger);
  });

  it("restores focus when an unfocusable outside target dismisses a filter", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });
    fireEvent.click(dateTrigger);
    act(() => screen.getByRole("button", { name: /Friday, August 7/ }).focus());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(dateTrigger);

    const venueTrigger = screen.getByText("All venues").closest("button") as HTMLElement;
    fireEvent.click(venueTrigger);
    act(() => screen.getByLabelText("Holocene").focus());
    fireEvent.pointerDown(document.body);
    expect(venueTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(venueTrigger);
  });

  it("dismisses filters without crashing when focus moves to a non-node target", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const errors: unknown[] = [];
    function captureError(event: ErrorEvent) {
      errors.push(event.error);
      event.preventDefault();
    }
    window.addEventListener("error", captureError);

    try {
      const venueTrigger = screen.getByText("All venues").closest("button") as HTMLElement;
      fireEvent.click(venueTrigger);
      fireEvent.blur(venueTrigger, { relatedTarget: new window.EventTarget() });
      expect(errors).toEqual([]);
      expect(venueTrigger.getAttribute("aria-expanded")).toBe("false");

      const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });
      fireEvent.click(dateTrigger);
      fireEvent.blur(dateTrigger, { relatedTarget: new window.EventTarget() });
      expect(errors).toEqual([]);
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      window.removeEventListener("error", captureError);
    }
  });

  it("clears a focused venue selection and keeps only one filter open", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const venueTrigger = screen.getByRole("button", { name: "Venues, All venues" });
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });

    fireEvent.click(dateTrigger);
    fireEvent.click(venueTrigger);
    expect(screen.queryByRole("dialog")).toBeNull();
    const checkbox = screen.getByRole("checkbox", { name: "Holocene" });
    act(() => checkbox.focus());
    fireEvent.click(checkbox);
    const clear = screen.getByRole("button", { name: "Clear filters" });
    fireEvent.pointerDown(clear);
    fireEvent.click(clear);
    expect(venueTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("group", { name: "Filter by venue" })).toBeNull();
    expect(screen.getByText("Tomorrow")).toBeTruthy();

    fireEvent.click(venueTrigger);
    fireEvent.click(dateTrigger);
    expect(venueTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("dialog")).toBeTruthy();
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
