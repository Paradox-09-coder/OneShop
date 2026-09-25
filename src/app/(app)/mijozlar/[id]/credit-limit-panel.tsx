"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { ShieldAlert, Save } from "lucide-react";
import type { Currency } from "@prisma/client";
import Select from "@/components/select";

interface Props {
  clientId: string;
  initial: {
    creditLimit: number;
    creditLimitCurrency: Currency;
    creditLimitEnabled: boolean;
  };
  currentDebt: number;
}

export default function CreditLimitPanel({ clientId, initial, currentDebt }: Props) {
  const router = useRouter();
  const [limit, setLimit] = useState(initial.creditLimit);
  const [enabled, setEnabled] = useState(initial.creditLimitEnabled);
  const [currency, setCurrency] = useState<Currency>(initial.creditLimitCurrency);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const remaining = enabled ? limit - currentDebt : null;
  const overLimit = enabled && currentDebt > limit;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/credit-limit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditLimit: limit,
          creditLimitCurrency: currency,
          creditLimitEnabled: enabled,
        }),
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
    <div
      className={`panel p-5 ${
        overLimit ? "border-l-4 border-l-danger bg-danger-light/10" : ""
      }`}
    >
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <ShieldAlert size={16} className="text-primary" />
        Kredit limit
      </h3>

      <label className="inline-flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span className="text-sm">Kredit limit yoqilgan</span>
      </label>

      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={!enabled}
            className="w-full px-3 py-2 rounded-xl border border-border bg-white disabled:opacity-50"
            placeholder="100 000 000"
          />
          <Select
            value={currency}
            onChange={(v) => setCurrency(v as Currency)}
            disabled={!enabled}
            options={[
              { value: "UZS", label: "so'm" },
              { value: "USD", label: "$" },
              { value: "EUR", label: "€" },
              { value: "RUB", label: "₽" },
            ]}
          />
        </div>

        {enabled && (
          <div className="mt-3 p-3 rounded-xl bg-gray-50 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Joriy qarz:</span>
              <span className="font-semibold">
                {formatMoney(currentDebt, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Ruxsat limit:</span>
              <span className="font-semibold">{formatMoney(limit, currency)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="text-ink-soft text-xs">Qoldiq:</span>
              <span
                className={`font-bold ${
                  overLimit ? "text-danger" : "text-success"
                }`}
              >
                {formatMoney(remaining ?? 0, currency)}
              </span>
            </div>
            {overLimit && (
              <div className="mt-2 p-2 rounded-lg bg-danger-light/40 text-danger text-xs">
                Kredit limit oshib ketgan!
              </div>
            )}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 mt-2 inline-flex items-center justify-center gap-1"
        >
          <Save size={14} /> {saving ? "..." : "Saqlash"}
        </button>
        {msg && <p className="text-xs text-center text-success">{msg}</p>}
      </div>
    </div>
  );
}
