import { useState } from "react";
import { DayPicker, TZDate, type DateRange } from "react-day-picker";
import { formatCompactDate, PORTLAND_TIME_ZONE, portlandDate, type DateSelection } from "@/lib/events";

function calendarDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new TZDate(year, month - 1, day, PORTLAND_TIME_ZONE);
}

interface DateCalendarProps {
  today: string;
  selection?: DateSelection;
  helpId: string;
  onSelect: (selection: DateSelection) => void;
  onComplete: () => void;
}

// Mount only while open: browsing and an unfinished range belong to this session.
export function DateCalendar({ today, selection, helpId, onSelect, onComplete }: DateCalendarProps) {
  const [month, setMonth] = useState(selection?.from ?? today);
  const [anchor, setAnchor] = useState<string>();
  const rangeAnchor = anchor && anchor >= today ? anchor : undefined;

  function selectDate(_: DateRange | undefined, triggerDate: Date) {
    const date = portlandDate(triggerDate);
    if (date < today) return;

    if (!rangeAnchor) {
      onSelect({ from: date, to: date });
      setAnchor(date);
      return;
    }

    onSelect({
      from: date < rangeAnchor ? date : rangeAnchor,
      to: date < rangeAnchor ? rangeAnchor : date,
    });
    onComplete();
  }

  return (
    <>
      <DayPicker
        mode="range"
        autoFocus
        navLayout="after"
        timeZone={PORTLAND_TIME_ZONE}
        noonSafe
        today={calendarDate(today)}
        startMonth={calendarDate(today)}
        month={calendarDate(month < today ? today : month)}
        onMonthChange={(date) => setMonth(portlandDate(date))}
        disabled={{ before: calendarDate(today) }}
        selected={selection ? {
          from: calendarDate(selection.from),
          to: rangeAnchor ? undefined : calendarDate(selection.to),
        } : undefined}
        onSelect={selectDate}
      />
      <p id={helpId} className="calendar-help" aria-live="polite">
        {rangeAnchor
          ? `${formatCompactDate(rangeAnchor)} selected. Choose another date for a range, or choose the same date again for one day.`
          : "Choose a date, then an end date for a range. Choose the same date twice for one day."}
      </p>
    </>
  );
}
