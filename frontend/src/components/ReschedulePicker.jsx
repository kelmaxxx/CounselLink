import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { syncServerTime, serverTodayStr, serverHour, serverMonthStart } from "../utils/serverTime";

export const RESCHED_BLOCKS = [
  { label: "9:00 AM – 12:00 PM", value: "9:00-12:00", name: "Morning", cutoffHour: 12 },
  { label: "1:00 PM – 5:00 PM", value: "1:00-5:00", name: "Afternoon", cutoffHour: 17 },
];

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfToday = () => {
  const m = serverTodayStr().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

// Server-clock checks (synced Manila time) — the device clock can't be trusted.
const isSlotPast = (block, dateISO) => {
  if (dateISO !== serverTodayStr()) return false;
  return serverHour() >= block.cutoffHour;
};

const todayHasSlots = () => {
  const todayISO = serverTodayStr();
  return RESCHED_BLOCKS.some((b) => !isSlotPast(b, todayISO));
};

const isSelectableDate = (d) => {
  if (d < startOfToday() || isWeekend(d)) return false;
  if (toISO(d) === serverTodayStr()) return todayHasSlots();
  return true;
};

function MonthGrid({ month, selected, onSelect }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 text-center mb-2">
        {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="text-[11px] font-medium text-gray-400 text-center py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`b-${i}`} />;
          const date = new Date(year, m, day);
          const iso = toISO(date);
          const selectable = isSelectableDate(date);
          const isSelected = selected === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              className={[
                "h-9 w-full rounded-full text-sm tabular-nums transition",
                isSelected
                  ? "bg-maroon-500 text-white font-semibold shadow-sm"
                  : selectable
                    ? "text-gray-700 hover:bg-maroon-50 hover:text-maroon-700"
                    : "text-gray-300 cursor-not-allowed line-through decoration-gray-200",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReschedulePicker({ date, timeSlot, onDateChange, onTimeSlotChange }) {
  const [viewMonth, setViewMonth] = useState(() => serverMonthStart());
  // Re-render once the server-clock sync lands (wrong-clock devices).
  const [, setClockTick] = useState(0);
  useEffect(() => {
    syncServerTime().then(() => setClockTick((t) => t + 1));
  }, []);

  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const canGoPrev = viewMonth > new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-500">Weekends & past dates unavailable</span>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <MonthGrid month={viewMonth} selected={date} onSelect={onDateChange} />

      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">New time block</span>
        </div>
        {!date && (
          <p className="text-xs text-gray-400 mb-3">Select a date above to choose a time block.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RESCHED_BLOCKS.map((block) => {
            const active = timeSlot === block.value;
            const past = date ? isSlotPast(block, date) : false;
            const disabled = !date || past;
            return (
              <button
                key={block.value}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onTimeSlotChange(active ? "" : block.value)}
                className={[
                  "rounded-xl border p-4 text-left transition relative",
                  active && !past
                    ? "bg-maroon-500 border-maroon-500 ring-2 ring-maroon-300"
                    : past
                    ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                    : disabled
                    ? "opacity-50 cursor-not-allowed bg-white border-gray-200"
                    : "bg-white border-gray-200 hover:border-maroon-300 hover:bg-maroon-50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className={`text-sm font-semibold mb-0.5 ${active && !past ? "text-white" : "text-gray-900"}`}>
                      {block.name}
                    </p>
                    <p className={`text-xs ${active && !past ? "text-maroon-100" : "text-gray-500"}`}>{block.label}</p>
                  </div>
                  {past && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 flex-shrink-0">
                      Passed
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
