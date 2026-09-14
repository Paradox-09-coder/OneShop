"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import MoneyInput from "@/components/money-input";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
  balanceCache: number;
}

export default function TransferButton({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fromAccount = accounts.find((a) => a.id === fromId);

  function reset() {
    setFromId("");
    setToId("");
    setAmount("");
    setNote("");
    setError("");
  }

  async function submit() {
    if (!fromId || !toId) {
      setError("Manba va manzil hisobni tanlang");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Summani kiriting");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/moliya/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: fromId,
          toAccountId: toId,
          amount: amt,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Xatolik yuz berdi");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-gray-50 text-sm font-semibold"
      >
        <ArrowLeftRight size={15} /> Tranzaksiya
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Hisoblar orasida ko'chirish</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-ink-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Qaysi hisobdan
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="">— tanlang —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === toId}>
                      {a.name} ({formatMoney(a.balanceCache, a.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Qaysi hisobga
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="">— tanlang —</option>
                  {accounts
                    .filter((a) => a.currency === (fromAccount?.currency ?? a.currency))
                    .map((a) => (
                      <option key={a.id} value={a.id} disabled={a.id === fromId}>
                        {a.name} ({formatMoney(a.balanceCache, a.currency)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Summa {fromAccount ? `(${fromAccount.currency})` : ""}
                </label>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Masalan: naqddan kartaga o'tkazish"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full mt-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Ko'chirilmoqda..." : "Ko'chirish"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
