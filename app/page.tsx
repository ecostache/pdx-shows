import rawEvents from "@/data/events.json";
import { EventExplorer } from "@/components/event-explorer";
import { parseEvents, portlandDate } from "@/lib/events";

export default function Home() {
  const events = parseEvents(rawEvents);
  if (events.length === 0) {
    throw new Error("The event feed is empty. Run `pnpm scrape` before building the site.");
  }

  return (
    <main>
      <header className="site-header">
        <p className="eyebrow">Live music in Portland, Oregon</p>
        <h1 className="site-title">PDX Shows</h1>
      </header>
      <EventExplorer events={events} today={portlandDate()} />
    </main>
  );
}
