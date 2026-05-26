'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import type { HolidayMapEntry } from '@/hooks/use-analytics';

interface Props {
  selected: Date[];
  onSelect: (dates: Date[]) => void;
  holidayMap: Record<string, HolidayMapEntry>;
  /** Dates that have ridership data available */
  availableDates?: Set<string>;
  /** Preferred starting month — calendar uses this instead of 2 months ago */
  defaultMonth?: Date;
  /** Data range metadata showing headline vs KTMB coverage */
  dataRange?: {
    minDate: string | null;
    headlineThrough: string | null;
    ktmbThrough: string | null;
    totalDays: number;
  } | null;
}

export function CalendarPicker({ selected, onSelect, holidayMap, availableDates, defaultMonth, dataRange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (defaultMonth) return defaultMonth;
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d;
  });

  // Compute the date boundaries from available dates (used for out-of-range checks)
  const dateBounds = useMemo(() => {
    if (!availableDates || availableDates.size === 0) return null;
    const sorted = [...availableDates].sort();
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }, [availableDates]);


  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekStart = getDay(startOfMonth(currentMonth));

  const toggleDate = (d: Date) => {
    const exists = selected.find((s) => isSameDay(s, d));
    if (exists) {
      onSelect(selected.filter((s) => !isSameDay(s, d)));
    } else if (selected.length < 2) {
      onSelect([...selected, d]);
    } else {
      onSelect([d]); // reset to new selection
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-4 sm:p-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <CalIcon className="w-4 h-4 text-[#85AB8B]" />
          Date Comparison
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-[var(--text-secondary)] w-28 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span
            key={d}
            className="text-[10px] font-semibold text-[var(--text-faint)] uppercase"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: weekStart }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selected.find((s) => isSameDay(s, day));
          const highlight = holidayMap[dateStr];
          const hasData = availableDates ? availableDates.has(dateStr) : true;
          const isOutOfRange = !hasData && availableDates && availableDates.size > 0;
          const isKtmbOnly = hasData && dataRange?.headlineThrough && dateStr > dataRange.headlineThrough;

          return (
            <button
              key={dateStr}
              onClick={() => toggleDate(day)}
              className={`
                relative h-8 w-full rounded-lg text-xs font-medium transition-all duration-200
                ${isToday(day) ? 'ring-1 ring-[#85AB8B]/60' : ''}
                ${
                  isSelected
                    ? 'bg-[#85AB8B] text-[var(--accent-heading)] shadow-lg shadow-[#85AB8B]/20'
                    : isOutOfRange
                      ? 'text-[var(--text-ghost)] opacity-30 cursor-default'
                      : isKtmbOnly
                        ? 'text-teal-400/80 hover:bg-teal-400/10 hover:text-teal-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }
              `}
              title={
                isOutOfRange
                  ? 'No data available for this date'
                  : isKtmbOnly
                    ? 'KTMB data only — Prasarana pending monthly audit'
                    : highlight?.name ?? undefined
              }
              disabled={isOutOfRange}
            >
              {format(day, 'd')}
              {/* Holiday / day-type dot */}
              {highlight && !isSelected && !isOutOfRange && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full
                    ${
                      highlight.type === 'holiday-confirmed'
                        ? 'bg-red-400'
                        : highlight.type === 'holiday-estimated'
                          ? 'bg-orange-400'
                          : highlight.type === 'friday'
                            ? 'bg-yellow-400'
                            : 'bg-blue-400'
                    }
                  `}
                />
              )}
              {/* Warning pulse for estimated holidays */}
              {highlight?.confidence === 'low' && !isSelected && !isOutOfRange && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                  title={highlight.warnings[0] ?? 'Estimated date'}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[var(--border-faint)]">
        {availableDates && availableDates.size > 0 && (
          <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-ghost)] opacity-30" />
            No data
          </span>
        )}
        {dataRange?.headlineThrough && dataRange?.ktmbThrough && dataRange.ktmbThrough > dataRange.headlineThrough && (
          <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
            KTMB only
          </span>
        )}
        <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Confirmed
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Estimated
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Friday
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Weekend
        </span>
        <span className="text-[9px] text-[var(--text-ghost)]">
          · No dot = weekday
        </span>
      </div>

      {/* Data range hint */}
      {dataRange && (
        <div className="text-[9px] text-[var(--text-ghost)] mb-3 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#85AB8B]" />
            <span>
              Full data:{' '}
              <span className="text-[var(--text-muted)] tabular-nums">
                {dataRange.minDate} → {dataRange.headlineThrough}
              </span>
            </span>
          </div>
          {dataRange.headlineThrough && dataRange.ktmbThrough && dataRange.ktmbThrough > dataRange.headlineThrough && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>
                <span className="text-teal-400/70">KTMB only</span>:{' '}
                <span className="text-[var(--text-muted)] tabular-nums">
                  {dataRange.headlineThrough} → {dataRange.ktmbThrough}
                </span>
              </span>
            </div>
          )}
          <div className="text-[var(--text-ghost)]">
            {dataRange.totalDays.toLocaleString()} days · 2019–present
          </div>
        </div>
      )}

      {/* Comparison hint */}
      {selected.length === 2 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-faint)] text-xs text-[#85AB8B] font-medium">
          Comparing {format(selected[0], 'dd MMM yyyy')} vs{' '}
          {format(selected[1], 'dd MMM yyyy')}
        </div>
      )}
      {selected.length === 1 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-faint)] text-[10px] text-[var(--text-faint)]">
          Select one more date to compare
        </div>
      )}
    </div>
  );
}
