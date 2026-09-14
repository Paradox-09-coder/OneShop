"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MoneyInput from "@/components/money-input";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}
interface CounterpartyOption {
  id: string;
  name: string;
}

export default function NewTransactionButton({
  accounts,
  counterparties,
}: {
  accounts: AccountOption[];
  counterparties: CounterpartyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"IN" | "OUT">("IN");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const account = accounts.find((a) => a.id === accountId);

  function reset() {
    setKind("IN");
    setAccountId(accounts[0]?.id ?? "");
    setCounterpartyId("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setError("");
  }

  async function submit() {
    if (!accountId) {
      setError("Hisobni tanlang");
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
      const res = await fetch("/api/moliya/tranzaksiya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          kind,
          amount: amt,
          counterpartyId: counterpartyId || undefined,
          description: description.trim() || undefined,
          date,
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
        className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm"
      >
        <Plus size={15} /> Tranzaksiya qo'shish
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
              <h3 className="font-bold">Yangi tranzaksiya</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-ink-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKind("IN")}
                  className={cn(
                    "py-2 rounded-xl text-sm font-semibold border transition",
                    kind === "IN"
                      ? "bg-success/10 border-success text-success"
                      : "border-border text-ink-soft hover:bg-gray-50"
                  )}
                >
                  Kirim
                </button>
                <button
                  type="button"
                  onClick={() => setKind("OUT")}
                  className={cn(
                    "py-2 rounded-xl text-sm font-semibold border transition",
                    kind === "OUT"
                      ? "bg-danger/10 border-danger text-danger"
                      : "border-border text-ink-soft hover:bg-gray-50"
                  )}
                >
                  Chiqim
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Hisob
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Kontragent (ixtiyoriy)
                </label>
                <select
                  value={counterpartyId}
                  onChange={(e) => setCounterpartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="">— tanlanmagan —</option>
                  {counterparties.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Summa {account ? `(${account.currency})` : ""}
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
                  Sana
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masalan: do'kondan naqd sotuv"
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
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
