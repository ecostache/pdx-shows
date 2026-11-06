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
  it("keeps the calendar open through a touch blur before a date activates", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    const date = screen.getByRole("button", { name: /Friday, August 7/ });
    fireEvent.blur(document.activeElement!, { relatedTarget: null });
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(date);
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.queryByText("Later")).toBeNull();
  });

  it("allows native venue label activation after focus temporarily leaves the trigger", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByRole("button", { name: "Venues, All venues" });
    fireEvent.click(trigger);
    act(() => trigger.focus());
    const label = screen.getByRole("checkbox", { name: "Holocene" }).closest("label")!;
    fireEvent.blur(trigger, { relatedTarget: null });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(label);
    expect((screen.getByRole("checkbox", { name: "Holocene" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText("Tomorrow")).toBeNull();
    expect(screen.getByText("Later")).toBeTruthy();
  });

  it("dismisses after a transient blur with Escape, outside focus, or window blur", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByRole("button", { name: "Venues, All venues" });
    fireEvent.click(trigger);
    act(() => trigger.focus());
    act(() => trigger.blur());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    act(() => trigger.blur());
    act(() => screen.getByRole("link", { name: /Today/ }).focus());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    fireEvent(window, new Event("blur"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("advances an open calendar when Portland enters a new month", () => {
    vi.setSystemTime(new Date("2026-09-01T06:59:30Z"));
    render(<EventExplorer events={events} today="2026-08-31" />);
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    expect(screen.getByRole("grid", { name: "August 2026" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeTruthy();
  });

  it("preserves a future browsed month across midnight", () => {
    vi.setSystemTime(new Date("2026-09-01T06:59:30Z"));
    render(<EventExplorer events={events} today="2026-08-31" />);
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeTruthy();
  });

  it("announces filtered results and associates calendar instructions", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const resultStatus = screen.getByRole("status");
    expect(resultStatus.textContent).toBe("3 shows found.");
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    expect(screen.getByRole("button", { name: /Dates, All upcoming/ }).getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Choose a show date or range" });
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent).toContain("Choose a date");
    fireEvent.click(screen.getByRole("button", { name: /Friday, August 7/ }));
    expect(resultStatus.textContent).toBe("1 show found.");
  });

  it("returns focus to Dates after clearing an empty result", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });
    fireEvent.click(dateTrigger);
    fireEvent.click(screen.getByRole("button", { name: /Sunday, August 9/ }));
    fireEvent.click(screen.getByRole("button", { name: /Sunday, August 9/ }));
    const reset = screen.getByRole("button", { name: "Show everything" });
    act(() => reset.focus());
    fireEvent.click(reset);

    expect(document.activeElement).toBe(dateTrigger);
    expect(screen.getByText("Tomorrow")).toBeTruthy();
  });

  it("refreshes the Portland date as soon as a suspended tab becomes visible", () => {
    vi.setSystemTime(new Date("2026-08-07T06:59:30Z"));
    render(<EventExplorer events={events} today="2026-08-06" />);
    act(() => vi.advanceTimersByTime(0));
    vi.setSystemTime(new Date("2026-08-07T07:01:00Z"));
    fireEvent(document, new Event("visibilitychange"));

    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
  });

  it("orders date groups and hides venues with no upcoming events", () => {
    render(<EventExplorer events={[...events].reverse()} today="2026-08-06" />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Thursday, August 6, 2026", "Friday, August 7, 2026", "Saturday, August 8, 2026",
    ]);
    expect(screen.queryByLabelText("Past Venue")).toBeNull();
  });

  it("keeps a selected venue removable after refreshed data drops its events", () => {
    const { rerender } = render(<EventExplorer events={events} today="2026-08-06" />);
    fireEvent.click(screen.getByRole("button", { name: "Venues, All venues" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Holocene" }));

    rerender(<EventExplorer events={events.filter((event) => event.venue !== "Holocene")} today="2026-08-06" />);
    expect(screen.getByText("No shows found")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Holocene" }));
    expect(screen.getByText("Tomorrow")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Holocene" })).toBeNull();
  });

  it("starts a new range when an unfinished anchor expires at midnight", () => {
    vi.setSystemTime(new Date("2026-08-07T06:59:30Z"));
    render(<EventExplorer events={events} today="2026-08-06" />);
    fireEvent.click(screen.getByRole("button", { name: /Dates, All upcoming/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thursday, August 6/ }));
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(screen.getByRole("button", { name: /Saturday, August 8/ }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
    expect(screen.queryByText("Tomorrow")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Saturday, August 8/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("keeps popovers inside the viewport without accumulating horizontal corrections", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const trigger = screen.getByRole("button", { name: "Venues, All venues" });
    const panel = trigger.parentElement!.querySelector("fieldset")!;
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 100, 240, 56));
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(new DOMRect(-80, 164, 400, 200));
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(540);

    fireEvent.click(trigger);
    expect(panel.style.getPropertyValue("--popover-shift-x")).toBe("92px");
    expect(panel.style.getPropertyValue("--popover-available-width")).toBe("516px");
    fireEvent.scroll(window);
    expect(panel.style.getPropertyValue("--popover-shift-x")).toBe("92px");

    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 164, 400, 200));
    fireEvent.resize(window);
    expect(panel.style.getPropertyValue("--popover-shift-x")).toBe("-72px");
  });

  it("dismisses the date and venue filters with Escape and restores focus", () => {
    render(<EventExplorer events={events} today="2026-08-06" />);
    const dateTrigger = screen.getByRole("button", { name: /Dates, All upcoming/ });

    fireEvent.click(dateTrigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(dateTrigger);

    const trigger = screen.getByText("All venues").closest("button") as HTMLElement;
    const filter = trigger.closest(".venue-filter") as HTMLDivElement;

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);

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
    act(() => venueTrigger.focus());
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
