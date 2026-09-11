"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFilter {
  key: string;
  label: string;
  options: SelectOption[];
}

interface Props {
  searchPlaceholder?: string;
  searchKey?: string;
  selects?: SelectFilter[];
  dateRange?: { fromKey?: string; toKey?: string; label?: string };
}

// Har bir ro'yxat sahifasi uchun qayta ishlatiladigan qidiruv+filtr paneli.
// URL query parametrlarini o'zgartiradi (server komponent shulardan o'qib
// Prisma `where`ni quradi) — sahifa yangilanganda ham filtr saqlanadi.
export default function ListToolbar({
  searchPlaceholder = "Qidirish...",
  searchKey = "q",
  selects = [],
  dateRange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get(searchKey) ?? "");

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const current = sp.get(searchKey) ?? "";
    if (q === current) return;
    const t = setTimeout(() => update(searchKey, q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const fromKey = dateRange?.fromKey ?? "from";
  const toKey = dateRange?.toKey ?? "to";
  const hasFilters = Array.from(sp.keys()).length > 0;

  return (
    <div className="flex flex-wrap items-end gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-white text-sm"
        />
      </div>

      {selects.map((s) => (
        <label key={s.key} className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-soft px-0.5">{s.label}</span>
          <select
            value={sp.get(s.key) ?? ""}
            onChange={(e) => update(s.key, e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
          >
            <option value="">Barchasi</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {dateRange && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-soft px-0.5">
            {dateRange.label ?? "Sana"}
          </span>
          <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={sp.get(fromKey) ?? ""}
            onChange={(e) => update(fromKey, e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-border bg-white text-sm text-ink-soft"
            title={`${dateRange.label ?? "Sana"} — dan`}
          />
          <span className="text-ink-soft text-sm">—</span>
          <input
            type="date"
            value={sp.get(toKey) ?? ""}
            onChange={(e) => update(toKey, e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-border bg-white text-sm text-ink-soft"
            title={`${dateRange.label ?? "Sana"} — gacha`}
          />
          </div>
        </div>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-sm text-ink-soft hover:bg-gray-50"
        >
          <X size={14} /> Tozalash
        </button>
      )}
    </div>
  );
}
