"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function AddCounterpartyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("CLIENT");
  const [phone, setPhone] = useState("");
  const [customerKind, setCustomerKind] = useState("RETAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setType("CLIENT");
    setPhone("");
    setCustomerKind("RETAIL");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, phone, customerKind }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Xato");
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
        <Plus size={16} /> Yangi kontragent
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Yangi kontragent</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Ismi / Nomi</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Turi</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                >
                  <option value="CLIENT">Mijoz</option>
                  <option value="SUPPLIER">Ta'minotchi</option>
                  <option value="EMPLOYEE">Xodim</option>
                  <option value="FOUNDER">Ta'sischi</option>
                  <option value="LENDER">Kreditor</option>
                  <option value="OTHER">Boshqa</option>
                </select>
              </div>
              {type === "CLIENT" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Mijoz turi</label>
                  <select
                    value={customerKind}
                    onChange={(e) => setCustomerKind(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  >
                    <option value="RETAIL">Chakana</option>
                    <option value="RESELLER">Qayta sotuvchi</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  placeholder="+998 90 000 00 00"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-danger-light/30 border border-danger/40 text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
