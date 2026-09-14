"use client";

import { useMemo, useState, type FormEvent, type UIEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, UserPlus, Minus, Search, User, X, Package } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface ClientOpt {
  id: string;
  name: string;
  phone: string | null;
}

interface CategoryOpt {
  id: string;
  name: string;
}

interface CatalogOpt {
  id: string;
  name: string;
  sku: string;
  basePrice: number | null;
  basePriceCurrency: string;
  unitType: string;
  categoryId: string | null;
}

const ALL_CATEGORY = "__all__";
const UNCATEGORIZED = "__uncategorized__";

interface Line {
  catalogProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  recipeId?: string;
}

interface RecipeOpt {
  id: string;
  variantName: string;
}

interface Props {
  clients: ClientOpt[];
  catalog: CatalogOpt[];
  categories: CategoryOpt[];
  recipesByProduct: Record<string, RecipeOpt[]>;
  defaultExchangeRate: number;
}

type Mode = "PERCENT" | "AMOUNT";

export default function NewOrderForm({
  clients: initialClients,
  catalog,
  categories,
  recipesByProduct,
  defaultExchangeRate,
}: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState("");
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientVisibleCount, setClientVisibleCount] = useState(5);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState<string>(ALL_CATEGORY);
  const [pickerQty, setPickerQty] = useState<Record<string, number>>({});
  const [type, setType] = useState<"RETAIL" | "WHOLESALE" | "MANUFACTURING" | "POS">("RETAIL");
  const [priority, setPriority] = useState<
    "NORMAL" | "HIGH" | "VIP" | "URGENT_1D" | "URGENT_3D" | "URGENT_7D"
  >("NORMAL");
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

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientQuery]);
  const visibleClientMatches = clientMatches.slice(0, clientVisibleCount);

  function onClientListScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setClientVisibleCount((c) => Math.min(clientMatches.length, c + 5));
    }
  }

  function openPicker() {
    const initial: Record<string, number> = {};
    for (const l of lines) initial[l.catalogProductId] = l.quantity;
    setPickerQty(initial);
    setPickerQuery("");
    setPickerCategory(ALL_CATEGORY);
    setPickerOpen(true);
  }

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of catalog) {
      const key = p.categoryId ?? UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [catalog]);

  const pickerVisible = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return catalog.filter((p) => {
      if (pickerCategory !== ALL_CATEGORY) {
        const key = p.categoryId ?? UNCATEGORIZED;
        if (key !== pickerCategory) return false;
      }
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, pickerQuery, pickerCategory]);

  const pickerSelectedCount = Object.values(pickerQty).filter((q) => q > 0).length;
  const pickerTotalQty = Object.values(pickerQty).reduce(
    (s, q) => s + (q > 0 ? q : 0),
    0
  );

  function confirmPicker() {
    setLines((prev) => {
      const next: Line[] = [];
      for (const [productId, qty] of Object.entries(pickerQty)) {
        if (!qty || qty <= 0) continue;
        const existing = prev.find((l) => l.catalogProductId === productId);
        if (existing) {
          next.push({ ...existing, quantity: qty });
          continue;
        }
        const product = catalog.find((p) => p.id === productId);
        if (!product) continue;
        const recipes = recipesByProduct[productId] ?? [];
        next.push({
          catalogProductId: productId,
          productName: product.name,
          quantity: qty,
          unitPrice: product.basePrice ?? 0,
          recipeId: recipes.length === 1 ? recipes[0].id : undefined,
        });
      }
      return next;
    });
    setPickerOpen(false);
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
    const missingRecipe = lines.find(
      (l) => (recipesByProduct[l.catalogProductId]?.length ?? 0) > 1 && !l.recipeId
    );
    if (missingRecipe) {
      setError(`"${missingRecipe.productName}" uchun retsept variantini tanlang`);
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
              <div className="relative">
                <div
                  onClick={() => setClientPanelOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white cursor-pointer hover:border-primary/50"
                >
                  <User size={15} className="text-ink-soft shrink-0" />
                  <span className="flex-1 text-sm truncate">
                    {selectedClient
                      ? `${selectedClient.name}${selectedClient.phone ? ` — ${selectedClient.phone}` : ""}`
                      : "— tanlang —"}
                  </span>
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientId("");
                      }}
                      className="text-ink-soft hover:text-danger"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {clientPanelOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setClientPanelOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-12 z-30 panel p-2">
                      <div className="relative mb-1">
                        <Search
                          size={14}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
                        />
                        <input
                          autoFocus
                          value={clientQuery}
                          onChange={(e) => {
                            setClientQuery(e.target.value);
                            setClientVisibleCount(5);
                          }}
                          placeholder="Ism yoki telefon bo'yicha qidirish..."
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-sm"
                        />
                      </div>
                      <div
                        onScroll={onClientListScroll}
                        className="max-h-60 overflow-y-auto"
                      >
                        {visibleClientMatches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClientId(c.id);
                              setClientPanelOpen(false);
                              setClientQuery("");
                              setClientVisibleCount(5);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span className="text-ink-soft"> — {c.phone}</span>
                            )}
                          </button>
                        ))}
                        {clientMatches.length === 0 && (
                          <p className="text-xs text-ink-soft text-center py-3">
                            Mijoz topilmadi
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClientPanelOpen(false);
                          setAddingClient(true);
                        }}
                        className="w-full flex items-center gap-1.5 px-3 py-2 mt-1 rounded-lg text-sm font-semibold text-primary hover:bg-primary/5 border-t border-border"
                      >
                        <UserPlus size={14} /> Yangi mijoz qo'shish
                      </button>
                    </div>
                  </>
                )}
              </div>
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
                <option value="URGENT_1D">1 kun ichida</option>
                <option value="URGENT_3D">3 kun ichida</option>
                <option value="URGENT_7D">7 kun ichida</option>
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
            <h3 className="font-bold text-ink">Mahsulotlar</h3>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={openPicker}
                className="px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-gray-50 inline-flex items-center gap-1 font-semibold text-sm"
              >
                <Plus size={14} /> Mahsulot qo'shish
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <button
              type="button"
              onClick={openPicker}
              className="w-full py-10 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center gap-2 text-ink-soft"
            >
              <Package size={28} />
              <span className="text-sm font-medium">
                Bu yerga bosing va mahsulot tanlang
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              {lines.map((l, i) => {
                const recipeOptions = recipesByProduct[l.catalogProductId] ?? [];
                const needsRecipeChoice = recipeOptions.length > 1;
                return (
                <div key={i} className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div
                  className="grid grid-cols-12 gap-2 items-center"
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
                {needsRecipeChoice && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-ink-soft shrink-0">
                      Retsept varianti *
                    </label>
                    <select
                      value={l.recipeId ?? ""}
                      onChange={(e) =>
                        updateLine(i, { recipeId: e.target.value || undefined })
                      }
                      className={`flex-1 px-2 py-1.5 rounded-lg border bg-white text-sm ${
                        l.recipeId ? "border-border" : "border-danger"
                      }`}
                    >
                      <option value="" disabled>
                        — tanlang —
                      </option>
                      {recipeOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.variantName}
                        </option>
                      ))}
                    </select>
                    {!l.recipeId && (
                      <span className="text-xs text-danger shrink-0">
                        Tanlanmagan
                      </span>
                    )}
                  </div>
                )}
                </div>
                );
              })}
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

      {/* Mahsulot tanlash modali — kategoriya bo'yicha, Isell uslubida */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg">Mahsulot tanlash</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-[180px_1fr] overflow-hidden">
              <div className="border-r border-border p-2 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => setPickerCategory(ALL_CATEGORY)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    pickerCategory === ALL_CATEGORY
                      ? "bg-primary/10 text-primary"
                      : "text-ink-soft hover:bg-gray-50"
                  }`}
                >
                  <span>Barchasi</span>
                  <span className="text-xs font-bold">{catalog.length}</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickerCategory(c.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      pickerCategory === c.id
                        ? "bg-primary/10 text-primary"
                        : "text-ink-soft hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs font-bold shrink-0">
                      {categoryCounts.get(c.id) ?? 0}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col min-h-0">
                <div className="p-3 border-b border-border shrink-0">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                    />
                    <input
                      autoFocus
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                      placeholder="Mahsulot yoki SKU bo'yicha qidirish..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-white text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {pickerVisible.map((p) => {
                    const qty = pickerQty[p.id] ?? 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{p.name}</p>
                          <p className="text-xs text-ink-soft">
                            SKU {p.sku} · {p.unitType.toLowerCase()}
                          </p>
                        </div>
                        <input
                          type="number"
                          onFocus={(e) => e.currentTarget.select()}
                          min={0}
                          step="0.01"
                          value={qty || ""}
                          onChange={(e) =>
                            setPickerQty((prev) => ({
                              ...prev,
                              [p.id]: Number(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                          className="w-20 px-2 py-1.5 rounded-lg border border-border bg-white text-sm text-center"
                        />
                      </div>
                    );
                  })}
                  {pickerVisible.length === 0 && (
                    <p className="text-sm text-ink-soft text-center py-10">
                      Mahsulot topilmadi
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
              <span className="text-sm text-ink-soft">
                {pickerSelectedCount} mahsulot tanlandi · Jami: {pickerTotalQty} dona
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={confirmPicker}
                  disabled={pickerSelectedCount === 0}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  Qo'shish ({pickerSelectedCount} ta)
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
