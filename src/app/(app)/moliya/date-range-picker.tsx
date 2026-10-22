"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

type Range = "today" | "week" | "month" | "year" | "custom";

const PRESETS: { label: string; value: Range }[] = [
  { label: "Bugun", value: "today" },
  { label: "7 kun", value: "week" },
  { label: "Oy", value: "month" },
  { label: "Yil", value: "year" },
  { label: "Interval", value: "custom" },
];

interface Props {
  current: Range;
  from?: string;
  to?: string;
}

export default function DateRangePicker({ current, from, to }: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function setRange(range: Range) {
    if (range === "custom") {
      // Faqat sana maydonlarini ko'rsatamiz — "Qo'llash" bosilgandagina
      // haqiqiy filtr qo'llanadi (pastdagi applyCustom).
      const url = new URL(window.location.href);
      url.searchParams.set("range", "custom");
      router.push(url.pathname + url.search);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("range", range);
    url.searchParams.delete("from");
    url.searchParams.delete("to");
    router.push(url.pathname + url.search);
  }

  function applyCustom() {
    if (!customFrom) return;
    const url = new URL(window.location.href);
    url.searchParams.set("range", "custom");
    url.searchParams.set("from", customFrom);
    if (customTo) url.searchParams.set("to", customTo);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="panel p-3 mb-4 flex flex-wrap gap-2 items-center">
      <Calendar size={16} className="text-ink-soft ml-2" />
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setRange(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              current === p.value
                ? "bg-panel shadow-sm text-primary"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {current === "custom" && (
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-panel text-sm"
          />
          <span className="text-ink-soft text-sm">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-panel text-sm"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-full bg-primary text-white text-sm font-semibold"
          >
            Qo'llash
          </button>
        </div>
      )}
    </div>
  );
}
