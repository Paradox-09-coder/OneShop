"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

export default function ExchangeRateManager({ current }: { current: number }) {
  const router = useRouter();
  const [rate, setRate] = useState(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/exchange-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
      });
      const d = await res.json();
      if (!d.ok) return setMsg(d.error?.message ?? "Xato");
      setMsg("Saqlandi ✓");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium whitespace-nowrap">1 USD =</label>
      <input
        type="number" onFocus={(e) => e.currentTarget.select()}
        min={1}
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-border bg-panel"
      />
      <span className="text-sm text-ink-soft">so'm</span>
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50"
      >
        <Save size={14} />
        {saving ? "..." : "Saqlash"}
      </button>
      {msg && <span className="text-sm text-success">{msg}</span>}
    </div>
  );
}
