"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

interface Props {
  value: string; // "YYYY-MM-DD" yoki ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Native <input type="date"> ochilganda OS'ning o'z kalendari chiqadi —
// platformalar orasida stil bermasa bo'lmaydi. Shu uchun o'zimizning
// kalendarimiz: tugma bosilganda oy-kun panjarasi (grid) ochiladi.
export default function DatePicker({
  value,
  onChange,
  placeholder = "Sana tanlang",
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : null;
  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  function openCalendar() {
    setViewMonth(selectedDate ?? new Date());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const out: Date[] = [];
    let d = start;
    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [viewMonth]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-white text-left text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
          "border-border hover:border-primary/40",
          open && "border-primary ring-2 ring-primary/15",
          className
        )}
      >
        <span className={cn(!selectedDate && "text-ink-soft")}>
          {selectedDate ? format(selectedDate, "dd.MM.yyyy") : placeholder}
        </span>
        <Calendar size={15} className="shrink-0 text-ink-soft" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 rounded-xl border border-border bg-white shadow-lg p-3 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-ink">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-[11px] font-semibold text-ink-soft py-1">
                {w}
              </span>
            ))}
            {days.map((d) => {
              const selected = selectedDate && isSameDay(d, selectedDate);
              const inMonth = isSameMonth(d, viewMonth);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(format(d, "yyyy-MM-dd"));
                    setOpen(false);
                  }}
                  className={cn(
                    "mx-auto w-8 h-8 rounded-lg text-sm transition",
                    !inMonth && "text-ink-soft/40",
                    inMonth && !selected && "text-ink hover:bg-gray-100",
                    selected && "bg-primary text-white font-semibold",
                    !selected && isToday(d) && "ring-1 ring-primary/50"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 w-full text-center text-xs text-ink-soft hover:text-danger py-1"
            >
              Tozalash
            </button>
          )}
        </div>
      )}
    </div>
  );
}
