"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

// Native <select>'ning ochilgan ro'yxati brauzer/OS tomonidan chizilib,
// stil berib bo'lmaydi — shu uchun o'zimiznikini yasadik: yopiq holati oddiy
// tugma, ochilganda esa to'liq stil beriladigan ro'yxat chiqadi.
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Tanlang...",
  className,
  disabled,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-white text-left text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-danger" : "border-border hover:border-primary/40",
          open && "border-primary ring-2 ring-primary/15",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-ink-soft")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-ink-soft transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-border bg-white shadow-lg py-1 animate-fadeIn">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-soft">Variantlar yo&apos;q</p>
          ) : (
            options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => {
                  if (o.disabled) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition disabled:opacity-40 disabled:cursor-not-allowed",
                  o.value === value
                    ? "bg-primary/8 text-primary font-medium"
                    : "hover:bg-gray-50 text-ink"
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={14} className="shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
