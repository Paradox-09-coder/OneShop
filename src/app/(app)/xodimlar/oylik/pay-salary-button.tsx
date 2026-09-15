"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import MoneyInput from "@/components/money-input";

interface EmployeeOpt {
  id: string;
  name: string;
}

interface AccountOpt {
  id: string;
  name: string;
  currency: string;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PaySalaryButton({
  employees,
  accounts,
}: {
  employees: EmployeeOpt[];
  accounts: AccountOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setEmployeeId("");
    setAccountId("");
    setPeriod(currentPeriod());
    setAmountText("");
    setNote("");
    setError("");
  }

  async function submit() {
    if (!employeeId) return setError("Xodimni tanlang");
    if (!accountId) return setError("Hisobni tanlang");
    const amount = Number(amountText);
    if (!amount || amount <= 0) return setError("Summani kiriting");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/xodimlar/oylik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          accountId,
          period,
          amount,
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
      >
        <Plus size={16} /> Oylik to'lash
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
              <h3 className="font-bold">Oylik / avans to'lash</h3>
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
                  Xodim
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="">— tanlang —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Oy</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Qaysi hisobdan
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="">— tanlang —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Summa
                </label>
                <MoneyInput
                  value={amountText}
                  onChange={setAmountText}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Izoh
                </label>
                <div className="flex gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setNote("Oylik")}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-gray-50"
                  >
                    Oylik
                  </button>
                  <button
                    type="button"
                    onClick={() => setNote("Avans")}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs font-semibold hover:bg-gray-50"
                  >
                    Avans
                  </button>
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Masalan: Oylik + KPI"
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
              {loading ? "To'lanmoqda..." : "To'lash"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
