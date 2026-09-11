"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, UserPlus, Minus } from "lucide-react";
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
  defaultExchangeRate: number;
}

type Mode = "PERCENT" | "AMOUNT";

export default function NewOrderForm({ clients: initialClients, catalog, defaultExchangeRate }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<"RETAIL" | "WHOLESALE" | "MANUFACTURING" | "POS">("RETAIL");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "VIP">("NORMAL");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  const [exchangeRate, setExchangeRate] = useState(defaultExchangeRate);

  const [taxMode, setTaxMode] = useState<Mode>("PERCENT");
  const [taxValue, setTaxValue] = useState(0);

  const [discountMode, setDiscountMode] = useState<Mode>("PERCENT");
  const [discountValue, setDiscountValue] = useState(0);

  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline "add new client" drawer
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientKind, setNewClientKind] = useState<"RETAIL" | "RESELLER">("RETAIL");
  const [savingClient, setSavingClient] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const discountAmount = discountMode === "PERCENT" ? (subtotal * discountValue) / 100 : discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = taxMode === "PERCENT" ? (afterDiscount * taxValue) / 100 : taxValue;
  const grand = afterDiscount + taxAmount;

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

  async function saveClient() {
    if (!newClientName.trim()) {
      setError("Mijoz ismini kiriting");
      return;
    }
    setError(null);
    setSavingClient(true);
    try {
      const res = await fetch("/api/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
          type: "CLIENT",
          customerKind: newClientKind,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Mijoz qo'shishda xato");
        return;
      }
      const c = data.data.party;
      setClients((prev) => [{ id: c.id, name: c.name, phone: c.phone }, ...prev]);
      setClientId(c.id);
      setAddingClient(false);
      setNewClientName("");
      setNewClientPhone("");
    } finally {
      setSavingClient(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId) { setError("Mijozni tanlang"); return; }
    if (lines.length === 0) { setError("Kamida bitta mahsulot qo'shing"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          type,
          priority,
          orderCurrency: currency,
          exchangeRate: currency === "UZS" ? null : exchangeRate,
          taxRate: taxMode === "PERCENT" ? taxValue : 0,
          taxAmount: taxMode === "AMOUNT" ? taxValue : 0,
          discountPercent: discountMode === "PERCENT" ? discountValue : 0,
          discountAmount: discountMode === "AMOUNT" ? discountValue : 0,
          note,
          items: lines,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error?.message ?? "Xato"); return; }
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
            <div className="md:col-span-2">
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
                    {c.name}{c.phone ? ` — ${c.phone}` : ""}
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
              <label className="block text-sm font-medium mb-1.5">Ustuvorlik</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as never)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              >
                <option value="NORMAL">Odatiy</option>
                <option value="HIGH">Yuqori</option>
                <option value="VIP">VIP</option>
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
            {currency !== "UZS" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">
                  Valyuta kursi (saqlanadi) — 1 {currency} = ? UZS
                </label>
                <input
                  type="number" onFocus={(e) => e.currentTarget.select()}
                  min={1}
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                />
                <p className="text-xs text-ink-soft mt-1">
                  Sozlamalardagi kurs: {defaultExchangeRate.toLocaleString("ru-RU")} so'm.
                  Bu buyurtmada saqlab qolinadi.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Chegirma</label>
              <div className="flex gap-1">
                <input
                  type="number" onFocus={(e) => e.currentTarget.select()}
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-l-xl border border-border bg-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDiscountMode(discountMode === "PERCENT" ? "AMOUNT" : "PERCENT")
                  }
                  className="px-4 py-2 rounded-r-xl border border-l-0 border-border bg-gray-50 hover:bg-gray-100 font-bold text-sm"
                >
                  {discountMode === "PERCENT" ? "%" : currency}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">QQS</label>
              <div className="flex gap-1">
                <input
                  type="number" onFocus={(e) => e.currentTarget.select()}
                  min={0}
                  value={taxValue}
                  onChange={(e) => setTaxValue(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-l-xl border border-border bg-white"
                />
                <button
                  type="button"
                  onClick={() => setTaxMode(taxMode === "PERCENT" ? "AMOUNT" : "PERCENT")}
                  className="px-4 py-2 rounded-r-xl border border-l-0 border-border bg-gray-50 hover:bg-gray-100 font-bold text-sm"
                >
                  {taxMode === "PERCENT" ? "%" : currency}
                </button>
              </div>
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
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <h3 className="font-bold text-ink">Mahsulotlar va mijoz</h3>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setAddingClient(!addingClient)}
                className="px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-gray-50 inline-flex items-center gap-1 font-semibold text-sm"
              >
                <UserPlus size={14} /> Yangi mijoz
              </button>
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
                  <div className="col-span-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateLine(i, {
                          quantity: Math.max(1, (l.quantity ?? 1) - 1),
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white border border-border grid place-items-center"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number" onFocus={(e) => e.currentTarget.select()}
                      min={0.01}
                      step="0.01"
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(i, { quantity: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-white text-sm text-center"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateLine(i, { quantity: (l.quantity ?? 0) + 1 })
                      }
                      className="w-7 h-7 rounded-lg bg-white border border-border grid place-items-center"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" onFocus={(e) => e.currentTarget.select()}
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

      {/* Yangi mijoz modali — tugma bosilganda ochiladi */}
      {addingClient && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <h3 className="font-bold text-lg mb-3">Yangi mijoz qo'shish</h3>
            <div className="space-y-2">
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Ismi / kompaniya nomi"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                autoFocus
              />
              <input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Telefon"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              />
              <select
                value={newClientKind}
                onChange={(e) => setNewClientKind(e.target.value as never)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              >
                <option value="RETAIL">Chakana mijoz</option>
                <option value="RESELLER">Qayta sotuvchi</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingClient(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={saveClient}
                  disabled={savingClient}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {savingClient ? "..." : "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="panel p-5 sticky top-4">
          <h3 className="font-bold text-ink mb-3">Yakuniy hisob</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Mahsulotlar</span>
              <span className="font-semibold">{formatMoney(subtotal, currency)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-soft">
                  Chegirma
                  {discountMode === "PERCENT" ? ` (${discountValue}%)` : ""}
                </span>
                <span className="font-semibold text-warning">
                  −{formatMoney(discountAmount, currency)}
                </span>
              </div>
            )}
            {taxValue > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-soft">
                  QQS{taxMode === "PERCENT" ? ` (${taxValue}%)` : ""}
                </span>
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
            {currency !== "UZS" && (
              <p className="text-xs text-ink-soft pt-1">
                = {formatMoney(grand * exchangeRate, "UZS")} (kurs {exchangeRate})
              </p>
            )}
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
