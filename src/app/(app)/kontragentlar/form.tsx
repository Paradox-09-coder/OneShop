"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CounterpartyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("CLIENT");
  const [phone, setPhone] = useState("");
  const [customerKind, setCustomerKind] = useState("RETAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setName("");
      setPhone("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1.5">Ismi / Nomi</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
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

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? "Saqlanmoqda..." : "Qo'shish"}
      </button>
    </form>
  );
}
