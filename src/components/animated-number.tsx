"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, formatNumber } from "@/lib/utils";

// Ko'rsatkich raqami 0 dan (yoki oldingi qiymatdan) yangi qiymatgacha
// "sanab" chiqadi. Server va birinchi client render'da aynan yakuniy
// qiymat chiqadi (hydration mos keladi), animatsiya faqat effektda —
// React'ning o'z state'i orqali, DOM'ga qo'lda tegilmaydi.

type Kind = "money" | "number" | "percent" | "compact";

interface Props {
  value: number;
  kind?: Kind;
  currency?: string;
  /** percent uchun kasr xonalari (default 1) */
  decimals?: number;
  className?: string;
}

const DURATION = 900;

// 40 000 000 → "40 mln", 1 500 000 000 → "1,5 mlrd"
export function compactNumber(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${+(n / 1e9).toFixed(1)} mlrd`.replace(".", ",");
  if (a >= 1e6) return `${+(n / 1e6).toFixed(1)} mln`.replace(".", ",");
  if (a >= 1e3) return `${Math.round(n / 1e3)} ming`;
  return String(Math.round(n));
}

function format(v: number, kind: Kind, currency: string, decimals: number): string {
  switch (kind) {
    case "money":
      // UZS — butun so'm; boshqa valyutalar formatMoney ichida 2 xonali
      return formatMoney(currency === "UZS" ? Math.round(v) : v, currency);
    case "percent":
      return `${v.toFixed(decimals).replace(".", ",")}%`;
    case "compact":
      return compactNumber(v);
    default:
      return formatNumber(Math.round(v));
  }
}

export default function AnimatedNumber({
  value,
  kind = "number",
  currency = "UZS",
  decimals = 1,
  className,
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0); // birinchi mount'da 0 dan boshlanadi

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (from === value || !Number.isFinite(value)) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }
    // Boshlanish vaqtini birinchi kadrning o'zidan olamiz: rAF'ga berilgan
    // `now` kadr boshlangan payt bo'lib, effekt ichidagi performance.now()
    // dan oldin bo'lishi mumkin — aks holda progress manfiy chiqib, bir
    // kadrga "-0,4%" kabi manfiy son ko'rinib qolardi.
    let start = -1;
    let finished = false;
    let id = requestAnimationFrame(function step(now) {
      if (start < 0) start = now;
      const p = Math.min(1, Math.max(0, (now - start) / DURATION));
      const eased = 1 - Math.pow(1 - p, 3);
      // Oxirgi kadrda aynan haqiqiy qiymat — yaxlitlash xatosi qolmasin
      setDisplay(p >= 1 ? value : from + (value - from) * eased);
      if (p < 1) id = requestAnimationFrame(step);
      else finished = true;
    });
    return () => {
      cancelAnimationFrame(id);
      // Faqat yarmida uzilgan animatsiya (masalan StrictMode qayta mount)
      // keyingi safar boshidan boshlanadi; tugagani esa A → B davom etadi
      if (!finished) fromRef.current = from;
    };
  }, [value]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display, kind, currency, decimals)}
    </span>
  );
}
