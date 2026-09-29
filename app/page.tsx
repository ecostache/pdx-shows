import { connection } from "next/server";
import rawEvents from "@/data/events.json";
import { EventExplorer } from "@/components/event-explorer";
import { parseEvents, portlandDate } from "@/lib/events";

export default async function Home() {
  await connection();
  const today = portlandDate();
  const events = parseEvents(rawEvents).filter((event) => event.date >= today);

  return (
    <main>
      <header className="site-header">
        <p className="eyebrow">Live music in Portland, Oregon</p>
        <h1 className="site-title">PDX Shows</h1>
      </header>
      <EventExplorer events={events} today={today} />
    </main>
  );
}
