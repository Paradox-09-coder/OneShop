"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { Plus, Minus, Trash2, Receipt } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number | null;
  basePriceCurrency: string;
  unitType: string;
}

interface Line {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Props {
  products: Product[];
  walkInId: string | null;
  accounts: { id: string; name: string }[];
}

export default function PosClient({ products, walkInId, accounts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  const filtered = query
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 20)
    : products.slice(0, 20);

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  function add(p: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing)
        return prev.map((l) =>
          l.id === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      return [
        ...prev,
        { id: p.id, name: p.name, quantity: 1, price: p.basePrice ?? 0 },
      ];
    });
  }
  function inc(id: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l))
    );
  }
  function dec(id: string) {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0)
    );
  }
  function remove(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function checkout() {
    if (lines.length === 0) return;
    if (!walkInId) {
      alert("Walk-in mijoz topilmadi — seed skriptini ishga tushiring");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: walkInId,
          accountId,
          items: lines.map((l) => ({
            catalogProductId: l.id,
            productName: l.name,
            quantity: l.quantity,
            unitPrice: l.price,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error?.message ?? "Xato");
        return;
      }
      setLines([]);
      router.push(`/buyurtmalar/${data.data.order.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 panel p-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Mahsulot qidirish..."
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-white mb-4"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="text-left p-3 rounded-xl border border-border bg-white hover:bg-gray-50 hover:border-primary transition"
            >
              <p className="font-semibold text-sm line-clamp-2">{p.name}</p>
              <p className="text-xs text-ink-soft mt-1">{p.sku}</p>
              <p className="font-bold text-primary mt-1">
                {formatMoney(p.basePrice ?? 0, p.basePriceCurrency)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-5 sticky top-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Receipt size={18} /> Chek ({lines.length})
        </h3>
        <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-4">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-2 p-2 rounded-xl bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{l.name}</p>
                <p className="text-xs text-ink-soft">
                  {formatMoney(l.price, "UZS")}
                </p>
              </div>
              <button
                onClick={() => dec(l.id)}
                className="w-7 h-7 rounded-lg bg-white border border-border grid place-items-center"
              >
                <Minus size={12} />
              </button>
              <span className="w-8 text-center font-bold">{l.quantity}</span>
              <button
                onClick={() => inc(l.id)}
                className="w-7 h-7 rounded-lg bg-white border border-border grid place-items-center"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => remove(l.id)}
                className="w-7 h-7 rounded-lg text-danger grid place-items-center"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {lines.length === 0 && (
            <p className="text-sm text-ink-soft text-center py-6">
              Chek bo'sh
            </p>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-xs text-ink-soft mb-1">
            Kassaga tushadi:
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 mb-3">
          <div className="flex justify-between">
            <span className="text-sm text-ink-soft">Jami</span>
            <span className="text-xl font-bold text-primary">
              {formatMoney(total, "UZS")}
            </span>
          </div>
        </div>

        <button
          onClick={checkout}
          disabled={loading || lines.length === 0}
          className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Amalga oshirilmoqda..." : "Sotuvni yakunlash"}
        </button>
      </div>
    </div>
  );
}
