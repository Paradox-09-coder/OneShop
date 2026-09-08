"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface ClientOpt {
  id: string;
  name: string;
  phone: string | null;
}

interface CatalogOpt {
  id: string;
  name: string;
  sku: string;
  basePrice: number | null;
  basePriceCurrency: string;
  unitType: string;
}

interface Line {
  catalogProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  clients: ClientOpt[];
  catalog: CatalogOpt[];
}

export default function NewOrderForm({ clients, catalog }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<"RETAIL" | "WHOLESALE" | "MANUFACTURING" | "POS">("RETAIL");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  const [taxRate, setTaxRate] = useState(0);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = (total * taxRate) / 100;
  const grand = total + taxAmount;

  function addLine(product: CatalogOpt) {
    setLines((prev) => [
      ...prev,
      {
        catalogProductId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.basePrice ?? 0,
      },
    ]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Mijozni tanlang");
      return;
    }
    if (lines.length === 0) {
      setError("Kamida bitta mahsulot qo'shing");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          type,
          orderCurrency: currency,
          taxRate,
          note,
          items: lines,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Xato");
        return;
      }
      router.push(`/buyurtmalar/${data.data.order.id}`);
    } catch {
      setError("Server bilan ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="panel p-5">
          <h3 className="font-bold text-ink mb-3">Umumiy ma'lumot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Mijoz</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                required
              >
                <option value="">— tanlang —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `— ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Buyurtma turi</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as never)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              >
                <option value="RETAIL">Chakana</option>
                <option value="WHOLESALE">Ulgurji</option>
                <option value="MANUFACTURING">Ishlab chiqarish</option>
                <option value="POS">Kassa (POS)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Valyuta</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as never)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              >
                <option value="UZS">so'm (UZS)</option>
                <option value="USD">dollar (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">QQS (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Izoh</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              />
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink">Mahsulotlar</h3>
            <select
              onChange={(e) => {
                const p = catalog.find((x) => x.id === e.target.value);
                if (p) addLine(p);
                e.currentTarget.value = "";
              }}
              className="px-3 py-1.5 rounded-xl border border-border bg-white text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                + Mahsulot qo'shish
              </option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.sku}
                </option>
              ))}
            </select>
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-ink-soft py-6 text-center">
              Mahsulot qo'shilmagan
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50"
                >
                  <div className="col-span-4 text-sm font-semibold">
                    {l.productName}
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(i, { quantity: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-white text-sm"
                      placeholder="miqdor"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) =>
                        updateLine(i, { unitPrice: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-white text-sm"
                      placeholder="narx"
                    />
                  </div>
                  <div className="col-span-1 text-right text-sm font-semibold">
                    {formatMoney(l.quantity * l.unitPrice, currency)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="col-span-1 p-1.5 rounded-lg hover:bg-white text-danger justify-self-end"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-5 sticky top-4">
          <h3 className="font-bold text-ink mb-3">Yakuniy hisob</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Mahsulotlar</span>
              <span className="font-semibold">{formatMoney(total, currency)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-soft">QQS ({taxRate}%)</span>
                <span className="font-semibold">
                  {formatMoney(taxAmount, currency)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between">
              <span className="font-bold">Jami</span>
              <span className="font-bold text-lg text-primary">
                {formatMoney(grand, currency)}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-danger-light/30 border border-danger/40 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {loading ? "Saqlanmoqda..." : "Buyurtmani saqlash"}
          </button>
        </div>
      </div>
    </form>
  );
}
