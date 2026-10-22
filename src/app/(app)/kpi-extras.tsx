"use client";

import { useId } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// KPI kartochkalari uchun mayda analitika (Vessa referensi): o'zgarish
// foizi chipi va 30 kunlik trend chizig'i (sparkline).

/** ↗ 6,2% / ↘ 3,1% — oldingi davrga nisbatan. null = taqqoslab bo'lmaydi. */
export function DeltaChip({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-xs text-ink-soft">—</span>;
  }
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? "text-success" : "text-danger"
      }`}
    >
      <Icon size={13} strokeWidth={2.5} />
      {Math.abs(value).toFixed(1).replace(".", ",")}%
    </span>
  );
}

/** Silliq trend chizig'i + ostida yumshoq gradient; ochilganda chizilib chiqadi. */
export function Sparkline({
  data,
  label,
}: {
  data: number[];
  label: string;
}) {
  const gid = useId().replace(/:/g, "");
  const W = 120;
  const H = 40;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * W,
    H - 3 - ((v - min) / span) * (H - 8),
  ]);

  // Catmull-Rom → kubik Bezier: nuqtalardan o'tadigan silliq egri
  let d = pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  const area = pts.length ? `${d} L${W},${H} L0,${H} Z` : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-[120px] h-10 overflow-visible"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-in)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--chart-in)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} className="spark-area" />
      <path
        d={d}
        fill="none"
        stroke="var(--chart-in)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="spark-line"
      />
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r={3}
          fill="var(--chart-in)"
          stroke="var(--color-panel)"
          strokeWidth={2}
          className="spark-dot"
        />
      )}
    </svg>
  );
}

/** Ingichka progress chizig'i (masalan qarzning jami savdodagi ulushi). */
export function MiniBar({ percent, tone = "primary" }: { percent: number; tone?: "primary" | "warning" | "danger" }) {
  const p = Math.max(0, Math.min(100, percent));
  const color = tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : "bg-primary";
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} mini-bar`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
