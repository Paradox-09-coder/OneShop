"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";
import AnimatedNumber, { compactNumber as compact } from "@/components/animated-number";

// ─────────────────────────────────────────────────────────────────────
// Pul oqimi — oylar bo'yicha Kirim / Chiqim (Vessa "Inventory statistics"
// referensi). Oddiy SVG: ingichka ustunlar, tepasi yumaloq, yonma-yon
// ustunlar orasida 2px bo'shliq, hover'da oy bo'yicha tooltip.
// ─────────────────────────────────────────────────────────────────────

export interface CashflowPoint {
  month: string; // "2026-09"
  label: string; // "Sen"
  income: number;
  expense: number;
}

const H = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };
const GAP = 2;

// Y o'qi uchun "chiroyli" qadam: 1/2/5 × 10^k
function niceMax(v: number): { max: number; step: number } {
  if (v <= 0) return { max: 4, step: 1 };
  const raw = v / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  return { max: step * 4, step };
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  // viewBox kengligi = haqiqiy piksel kengligi, shunda 11px yozuv har
  // ekranda 11px bo'lib qoladi (qotib qolgan 720 kenglikda telefonda ~5px edi)
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mount'dan keyingi kadrda ustunlar pastdan o'sib chiqadi
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const peak = Math.max(0, ...data.flatMap((d) => [d.income, d.expense]));
  const { max, step } = niceMax(peak);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, data.length);
  const BAR = Math.max(4, Math.min(9, (slot - 8) / 2 - GAP));
  // Tor ekranda oy nomlari bir-birini bosmasin — har ikkinchisini yozamiz
  const labelEvery = slot < 34 ? 2 : 1;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = Array.from({ length: 5 }, (_, i) => i * step);

  const totalIn = data.reduce((s, d) => s + d.income, 0);
  const totalOut = data.reduce((s, d) => s + d.expense, 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-bold text-ink">Pul oqimi</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            {`Oxirgi ${data.length} oy · so'mdagi tranzaksiyalar`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--chart-in)" }} />
            Kirim <b className="text-ink font-semibold">{compact(totalIn)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--chart-out)" }} />
            Chiqim <b className="text-ink font-semibold">{compact(totalOut)}</b>
          </span>
        </div>
      </div>

      <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full h-auto overflow-visible"
          role="img"
          aria-label={`Pul oqimi: jami kirim ${formatMoney(totalIn)}, jami chiqim ${formatMoney(totalOut)}`}
        >
          {/* Gorizontal to'r va Y o'qi yozuvlari */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--color-border)" : "var(--chart-grid)"}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-soft"
                fontSize={11}
              >
                {compact(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const active = hover === i;
            const dim = hover !== null && !active;
            const bars = [
              { v: d.income, x: cx - BAR - GAP / 2, fill: "var(--chart-in)" },
              { v: d.expense, x: cx + GAP / 2, fill: "var(--chart-out)" },
            ];
            return (
              <g key={d.month}>
                {/* Hover fon ustuni */}
                <rect
                  x={cx - slot / 2 + 4}
                  y={PAD.top}
                  width={slot - 8}
                  height={innerH}
                  rx={10}
                  fill="var(--chart-grid)"
                  opacity={active ? 1 : 0}
                  style={{ transition: "opacity .2s" }}
                />
                {bars.map((b, j) => {
                  const bh = Math.max(0, (b.v / max) * innerH);
                  return (
                    <path
                      key={j}
                      d={roundedTop(b.x, y(0), BAR, bh, 4)}
                      fill={b.fill}
                      opacity={dim ? 0.35 : 1}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "bottom",
                        transform: grown ? "scaleY(1)" : "scaleY(0)",
                        transition: `transform .8s cubic-bezier(.22,1,.36,1) ${i * 45 + j * 30}ms, opacity .2s`,
                      }}
                    />
                  );
                })}
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  className={active ? "fill-ink" : "fill-ink-soft"}
                  fontWeight={active ? 600 : 400}
                >
                  {i % labelEvery === 0 || active ? d.label : ""}
                </text>
                {/* Kattaroq hit-target — butun oy ustuni */}
                <rect
                  x={cx - slot / 2}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>

        {h && hover !== null && (
          <div
            // Gorizontal siljish `translate` xossasida — fadeIn keyframe'i
            // `transform`ni egallaydi, ikkalasi to'qnashmasin. Telefonda
            // tooltip ustunga emas, grafik kengligi bo'ylab joylashadi.
            className="absolute top-2 pointer-events-none z-10 min-w-[180px] max-sm:left-2! max-sm:right-2! max-sm:translate-none! max-sm:min-w-0! rounded-2xl border border-border bg-panel shadow-lg px-3.5 py-3 text-xs animate-fadeIn"
            style={{
              left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`,
              translate:
                hover > data.length / 2 ? "calc(-100% - 18px) 0" : "18px 0",
            }}
          >
            <p className="font-semibold text-ink mb-2">{h.label} {h.month.slice(0, 4)}</p>
            <Row color="var(--chart-in)" label="Kirim" value={formatMoney(h.income)} />
            <Row color="var(--chart-out)" label="Chiqim" value={formatMoney(h.expense)} />
            <div className="border-t border-border mt-2 pt-2 flex justify-between gap-4">
              <span className="text-ink-soft">Sof</span>
              <span className={`font-semibold ${h.income - h.expense < 0 ? "text-danger" : "text-ink"}`}>
                {formatMoney(h.income - h.expense)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-ink-soft">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}

// Faqat tepa burchaklari yumaloq ustun (pastki qismi o'qqa yopishgan)
function roundedTop(x: number, baseY: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  const top = baseY - h;
  return `M${x},${baseY} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${baseY} Z`;
}

// ─────────────────────────────────────────────────────────────────────
// To'lov yig'ilishi — yarim doira "tishli" gauge (Vessa "Sales overview").
// Foiz = mijozlardan yig'ilgan / kelishilgan jami summa.
// ─────────────────────────────────────────────────────────────────────

const TICKS = 56;

export function CollectionGauge({
  percent,
  orders,
  agreed,
  paid,
}: {
  percent: number;
  orders: number;
  agreed: number;
  paid: number;
}) {
  const [shown, setShown] = useState(0);

  // Tishlar chapdan o'ngga ketma-ket "yonadi"
  useEffect(() => {
    const target = Math.round((Math.max(0, Math.min(100, percent)) / 100) * TICKS);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1100));
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const cx = 150;
  const cy = 150;
  const r1 = 98;
  const r2 = 136;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <h2 className="font-bold text-ink">{"To'lov yig'ilishi"}</h2>
        <p className="text-xs text-ink-soft mt-0.5">{"Kelishilgan summadan qancha to'langan"}</p>
      </div>

      <div className="relative flex-1 flex items-end justify-center">
        <svg viewBox="0 0 300 160" className="w-full max-w-[320px] h-auto" aria-hidden>
          {Array.from({ length: TICKS }, (_, i) => {
            const a = Math.PI - (i / (TICKS - 1)) * Math.PI;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const on = i < shown;
            return (
              <line
                key={i}
                x1={cx + r1 * cos}
                y1={cy - r1 * sin}
                x2={cx + r2 * cos}
                y2={cy - r2 * sin}
                stroke={on ? "var(--chart-in)" : "var(--chart-track)"}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-[34px] font-bold tracking-tight text-ink leading-none">
            <AnimatedNumber value={percent} kind="percent" />
          </p>
          <p className="text-xs text-ink-soft mt-1.5">{"yig'ilgan"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-ink-soft">Buyurtmalar soni</p>
          <p className="text-lg font-bold text-ink mt-0.5"><AnimatedNumber value={orders} /></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-soft">{"To'langan / jami"}</p>
          <p className="text-sm font-bold text-ink mt-1">
            <AnimatedNumber value={paid} kind="compact" />
            <span className="text-ink-soft font-medium"> / {compact(agreed)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
