import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const { feed, connection } = vi.hoisted(() => ({
  feed: [
    { date: "2026-08-06", venue: "Holocene", title: "Thursday Show" },
    { date: "2026-08-07", venue: "Holocene", title: "Friday Show" },
  ],
  connection: vi.fn(async () => {}),
}));

vi.mock("next/server", () => ({ connection }));
vi.mock("@/data/events.json", () => ({ default: feed }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Home", () => {
  it("renders upcoming shows for each request's Portland date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T06:59:00Z"));
    const beforeMidnight = renderToStaticMarkup(await Home());
    expect(beforeMidnight).toContain("Thursday Show");
    expect(beforeMidnight).toContain("Friday Show");

    vi.setSystemTime(new Date("2026-08-07T07:01:00Z"));
    const afterMidnight = renderToStaticMarkup(await Home());
    expect(afterMidnight).not.toContain("Thursday Show");
    expect(afterMidnight).toContain("Friday Show");
    expect(connection).toHaveBeenCalledTimes(2);
  });

  it("renders the empty state when the feed is empty", async () => {
    const savedFeed = feed.splice(0);
    try {
      const html = renderToStaticMarkup(await Home());
      expect(html).toContain("No shows found");
      expect(html).toContain("Check back soon for upcoming shows.");
    } finally {
      feed.push(...savedFeed);
    }
  });
});
