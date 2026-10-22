"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import Select from "./select";
import DatePicker from "./date-picker";

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
  // true bo'lsa — select/sana filtrlari alohida oynada (popover) ochiladi,
  // qidiruv qatori yonidagi filtr belgisi bosilganda. Standart: filtrlar
  // to'g'ridan-to'g'ri qatorda ko'rinadi (eski xatti-harakat).
  popover?: boolean;
}

// Har bir ro'yxat sahifasi uchun qayta ishlatiladigan qidiruv+filtr paneli.
// URL query parametrlarini o'zgartiradi (server komponent shulardan o'qib
// Prisma `where`ni quradi) — sahifa yangilanganda ham filtr saqlanadi.
export default function ListToolbar({
  searchPlaceholder = "Qidirish...",
  searchKey = "q",
  selects = [],
  dateRange,
  popover = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get(searchKey) ?? "");
  const [panelOpen, setPanelOpen] = useState(false);
  // Popover ichida — "Tayyor" bosilgunga qadar draft holatda saqlanadi
  const [draft, setDraft] = useState<Record<string, string>>({});

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Sahifalash mavjud bo'lsa, filtr o'zgarganda 1-sahifaga qaytamiz
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyDraft() {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(draft)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setPanelOpen(false);
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
  const filterKeys = [...selects.map((s) => s.key), ...(dateRange ? [fromKey, toKey] : [])];
  const hasActiveFilters = filterKeys.some((k) => sp.get(k));
  const hasFilters = Array.from(sp.keys()).some((k) => k !== "view");

  function openPanel() {
    const initial: Record<string, string> = {};
    for (const k of filterKeys) initial[k] = sp.get(k) ?? "";
    setDraft(initial);
    setPanelOpen(true);
  }

  const selectField = (s: SelectFilter, value: string, onChange: (v: string) => void) => (
    <div key={s.key} className="flex flex-col gap-1">
      <span className="text-xs text-ink-soft font-medium">{s.label}</span>
      <Select
        value={value}
        onChange={onChange}
        options={[{ value: "", label: "Barchasi" }, ...s.options]}
      />
    </div>
  );

  if (popover) {
    return (
      <div className="flex items-center gap-2 mb-4 relative">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={openPanel}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-panel text-sm"
          />
        </div>
        <button
          onClick={openPanel}
          className={`relative p-2.5 rounded-xl border transition ${
            hasActiveFilters
              ? "border-primary text-primary bg-primary/5"
              : "border-border text-ink-soft hover:bg-gray-50"
          }`}
          aria-label="Filtrlar"
        >
          <SlidersHorizontal size={17} />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
          )}
        </button>

        {panelOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setPanelOpen(false)} />
            <div className="absolute left-0 top-12 z-30 panel p-4 w-[min(92vw,420px)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Filtrlar</h3>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-ink-soft"
                  aria-label="Yopish"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selects.map((s) =>
                  selectField(s, draft[s.key] ?? "", (v) =>
                    setDraft((d) => ({ ...d, [s.key]: v }))
                  )
                )}
              </div>
              {dateRange && (
                <div className="mt-3">
                  <span className="text-xs text-ink-soft font-medium">
                    {dateRange.label ?? "Sana oralig'i"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <DatePicker
                      value={draft[fromKey] ?? ""}
                      onChange={(v) => setDraft((d) => ({ ...d, [fromKey]: v }))}
                      className="flex-1"
                    />
                    <span className="text-ink-soft text-sm">—</span>
                    <DatePicker
                      value={draft[toKey] ?? ""}
                      onChange={(v) => setDraft((d) => ({ ...d, [toKey]: v }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    setDraft(Object.fromEntries(filterKeys.map((k) => [k, ""])));
                  }}
                  className="text-sm text-ink-soft hover:text-ink font-medium"
                >
                  Tozalash
                </button>
                <button
                  onClick={applyDraft}
                  className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
                >
                  Tayyor
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

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
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-panel text-sm"
        />
      </div>

      {selects.map((s) => selectField(s, sp.get(s.key) ?? "", (v) => update(s.key, v)))}

      {dateRange && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-soft px-0.5">
            {dateRange.label ?? "Sana"}
          </span>
          <div className="flex items-center gap-1.5">
          <DatePicker
            value={sp.get(fromKey) ?? ""}
            onChange={(v) => update(fromKey, v)}
          />
          <span className="text-ink-soft text-sm">—</span>
          <DatePicker
            value={sp.get(toKey) ?? ""}
            onChange={(v) => update(toKey, v)}
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
