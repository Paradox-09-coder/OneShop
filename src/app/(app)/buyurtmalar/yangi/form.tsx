"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, UserPlus, Minus, Search, User, X, Phone, Car, Tag } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import AddCounterpartyButton from "../../kontragentlar/add-counterparty-button";

interface ClientOpt {
  id: string;
  name: string;
  phone: string | null;
}

interface CategoryOpt {
  id: string;
  name: string;
}

interface AccountOpt {
  id: string;
  name: string;
  currency: string;
}

interface DriverOpt {
  id: string;
  name: string;
  phone: string | null;
  carNumber: string | null;
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

// Qo'shimcha xarajat turlari — hozircha faqat "Logistika" tanlansa
// haydovchi/manzil maydonlari ochiladi, qolganlari keyinroq funksional
// bo'ladi (hozircha shunchaki nom sifatida saqlanadi).
const EXPENSE_TYPES = [
  "Bojxona xarajati",
  "Logistika",
  "Montaj",
  "Qadoqlash",
  "Yetkazish",
];

interface ExtraExpense {
  id: string;
  expenseType: string;
  amountText: string;
}

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
  accounts: AccountOpt[];
  drivers: DriverOpt[];
}

type Mode = "PERCENT" | "AMOUNT";

export default function NewOrderForm({
  clients: initialClients,
  catalog,
  categories,
  recipesByProduct,
  defaultExchangeRate,
  accounts,
  drivers: initialDrivers,
}: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState("");
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientVisibleCount, setClientVisibleCount] = useState(10);

  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState<string>(ALL_CATEGORY);
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

  // To'lov usuli — To'liq to'lov/Zaklad hozirning o'zida hisobga pul
  // tushiradi (backendda Payment yaratiladi); Qarz bo'lsa hech narsa
  // olinmaydi, butun summa qarz sifatida qoladi.
  const [paymentType, setPaymentType] = useState<"FULL" | "PARTIAL" | "DEFERRED">(
    "DEFERRED"
  );
  const [depositText, setDepositText] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");

  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Qo'shimcha xarajatlar — "Logistika" turi tanlansa, shu qatorning
  // o'zida haydovchi/manzil tanlash ochiladi (buyurtma yaratilayotgan
  // paytdayoq, keyin alohida qo'shish shart emas).
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [driversList, setDriversList] = useState(initialDrivers);
  const [driverId, setDriverId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const selectedDriver = driversList.find((d) => d.id === driverId);
  const logisticsExpense = extraExpenses.find((e) => e.expenseType === "Logistika");

  function addExpenseRow() {
    setExtraExpenses((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, expenseType: "", amountText: "" },
    ]);
  }
  function updateExpenseRow(id: string, patch: Partial<ExtraExpense>) {
    setExtraExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeExpenseRow(id: string) {
    setExtraExpenses((prev) => prev.filter((e) => e.id !== id));
  }

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

  const extraExpensesTotal = extraExpenses.reduce(
    (s, e) => s + (Number(e.amountText) || 0),
    0
  );

  const availableAccounts = accounts.filter((a) => a.currency === currency);
  const depositValue = Math.min(Number(depositText) || 0, grand);
  const paidNow = paymentType === "FULL" ? grand : paymentType === "PARTIAL" ? depositValue : 0;
  const remainingDebt = Math.max(0, grand - paidNow);

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

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of catalog) {
      const key = p.categoryId ?? UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [catalog]);

  const productVisible = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return catalog.filter((p) => {
      if (productCategory !== ALL_CATEGORY) {
        const key = p.categoryId ?? UNCATEGORIZED;
        if (key !== productCategory) return false;
      }
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, productQuery, productCategory]);

  function getQty(productId: string): number {
    return lines.find((l) => l.catalogProductId === productId)?.quantity ?? 0;
  }

  // Katalogdagi narxlar hozircha faqat UZS'da — buyurtma valyutasi USD
  // bo'lsa, narxni xom raqam sifatida emas, joriy kursga qarab UZS<->USD
  // o'girib qo'yamiz (aks holda 155 000 so'mlik mahsulot $155 000 bo'lib
  // qolardi).
  function convertAmount(
    amount: number,
    from: string,
    to: string,
    rate: number
  ): number {
    if (from === to) return amount;
    if (from === "UZS" && to === "USD") return rate > 0 ? amount / rate : amount;
    if (from === "USD" && to === "UZS") return amount * rate;
    return amount;
  }

  function setProductQty(product: CatalogOpt, qty: number) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.catalogProductId === product.id);
      if (qty <= 0) {
        if (idx === -1) return prev;
        return prev.filter((_, i) => i !== idx);
      }
      if (idx !== -1) {
        return prev.map((l, i) => (i === idx ? { ...l, quantity: qty } : l));
      }
      const recipes = recipesByProduct[product.id] ?? [];
      return [
        ...prev,
        {
          catalogProductId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: convertAmount(
            product.basePrice ?? 0,
            product.basePriceCurrency,
            currency,
            exchangeRate
          ),
          // Faqat bitta variant bo'lsa — aniq, avtomatik tanlanadi. Bir
          // nechtasi bo'lsa — foydalanuvchi o'zi tanlashi kerak (pastda).
          recipeId: recipes.length === 1 ? recipes[0].id : undefined,
        },
      ];
    });
  }

  function incrementProduct(product: CatalogOpt) {
    setProductQty(product, getQty(product.id) + 1);
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
    if (paymentType !== "DEFERRED" && !paymentAccountId) {
      setError("To'lov qabul qilinadigan hisobni tanlang");
      return;
    }
    if (paymentType === "PARTIAL" && depositValue <= 0) {
      setError("Boshlang'ich to'lov summasini kiriting");
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
          paymentType,
          depositAmount: paymentType === "PARTIAL" ? depositValue : undefined,
          paymentAccountId: paymentType !== "DEFERRED" ? paymentAccountId : undefined,
          note,
          items: lines,
          additionalItems: extraExpenses
            .filter((e) => e.expenseType && Number(e.amountText) > 0)
            .map((e) => ({ name: e.expenseType, amount: Number(e.amountText) })),
          ...(logisticsExpense
            ? {
                driverName: selectedDriver?.name,
                driverPhone: selectedDriver?.phone ?? undefined,
                driverCarNumber: selectedDriver?.carNumber ?? undefined,
                deliveryAddress: deliveryAddress || undefined,
                deliveryCost: Number(logisticsExpense.amountText) || undefined,
                receiverName: receiverName || undefined,
                receiverPhone: receiverPhone || undefined,
                expectedDeliveryDate: expectedDeliveryDate || undefined,
              }
            : {}),
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
                            setClientVisibleCount(10);
                          }}
                          placeholder="Ism yoki telefon bo'yicha qidirish..."
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-sm"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto overscroll-contain">
                        {visibleClientMatches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClientId(c.id);
                              setClientPanelOpen(false);
                              setClientQuery("");
                              setClientVisibleCount(10);
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
                        {clientVisibleCount < clientMatches.length && (
                          <button
                            type="button"
                            onClick={() => setClientVisibleCount((c) => c + 10)}
                            className="w-full text-center px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-semibold text-primary"
                          >
                            Yana ko'rsatish ({clientMatches.length - clientVisibleCount} ta qoldi)
                          </button>
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
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-bold text-ink">Mahsulotlar</h3>
            {lines.length > 0 && (
              <span className="text-xs font-semibold text-ink-soft">
                {lines.length} tur tanlandi
              </span>
            )}
          </div>

          <div className="grid grid-cols-[160px_1fr] border border-border rounded-xl overflow-hidden">
            <div className="border-r border-border p-2 space-y-1 overflow-y-auto max-h-[420px] bg-gray-50/50">
              <button
                type="button"
                onClick={() => setProductCategory(ALL_CATEGORY)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  productCategory === ALL_CATEGORY
                    ? "bg-primary/10 text-primary"
                    : "text-ink-soft hover:bg-gray-100"
                }`}
              >
                <span>Barchasi</span>
                <span className="text-xs font-bold">{catalog.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setProductCategory(c.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    productCategory === c.id
                      ? "bg-primary/10 text-primary"
                      : "text-ink-soft hover:bg-gray-100"
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
              <div className="p-2 border-b border-border shrink-0">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                  />
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Mahsulot yoki SKU bo'yicha qidirish..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-white text-sm"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-[360px] p-2 space-y-1">
                {productVisible.map((p) => {
                  const qty = getQty(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => incrementProduct(p)}
                      className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                        qty > 0 ? "bg-primary/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <p className="text-xs text-ink-soft">
                          SKU {p.sku} · {p.unitType.toLowerCase()} ·{" "}
                          {formatMoney(p.basePrice ?? 0, p.basePriceCurrency)}
                        </p>
                      </div>
                      <input
                        type="number"
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.currentTarget.select()}
                        min={0}
                        step="0.01"
                        value={qty || ""}
                        onChange={(e) => setProductQty(p, Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-16 px-2 py-1.5 rounded-lg border border-border bg-white text-sm text-center shrink-0"
                      />
                    </div>
                  );
                })}
                {productVisible.length === 0 && (
                  <p className="text-sm text-ink-soft text-center py-10">
                    Mahsulot topilmadi
                  </p>
                )}
              </div>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wide">
                Tanlangan mahsulotlar
              </h4>
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

        <div className="panel p-5">
          <h3 className="font-bold text-ink mb-4">Narx va to'lov</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Valyuta</label>
              <select
                value={currency}
                onChange={(e) => {
                  const nextCurrency = e.target.value as "UZS" | "USD";
                  if (nextCurrency !== currency) {
                    // Valyuta almashtirilganda tanlangan mahsulotlarning
                    // narxi ham joriy kursga qarab qayta hisoblanadi —
                    // aks holda summalar bir zumda noto'g'ri bo'lib qoladi.
                    setLines((prev) =>
                      prev.map((l) => ({
                        ...l,
                        unitPrice: convertAmount(l.unitPrice, currency, nextCurrency, exchangeRate),
                      }))
                    );
                  }
                  setCurrency(nextCurrency);
                  setPaymentAccountId("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              >
                <option value="UZS">so'm (UZS)</option>
                <option value="USD">dollar (USD)</option>
              </select>
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
          </div>

          <div className="rounded-xl border border-border bg-gray-50/60 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-ink-soft" />
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wide">
                Chegirma
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountMode("PERCENT")}
                  className={`px-4 py-2 text-sm font-bold ${
                    discountMode === "PERCENT"
                      ? "bg-primary text-white"
                      : "bg-white text-ink-soft hover:bg-gray-50"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode("AMOUNT")}
                  className={`px-4 py-2 text-sm font-bold border-l border-border ${
                    discountMode === "AMOUNT"
                      ? "bg-primary text-white"
                      : "bg-white text-ink-soft hover:bg-gray-50"
                  }`}
                >
                  {currency}
                </button>
              </div>
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                min={0}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-white"
              />
            </div>
            {discountMode === "PERCENT" && (
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 50, 75].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountValue(p)}
                    className={`py-2 rounded-xl border text-sm font-bold transition ${
                      discountValue === p
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-gray-50"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-gray-50/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wide">
                Qo'shimcha xarajatlar
              </span>
              <button
                type="button"
                onClick={addExpenseRow}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <Plus size={14} /> Qo'shish
              </button>
            </div>
            <p className="text-xs text-ink-soft italic mb-3">
              Qo'shimcha xarajatlar narxga qo'shilmaydi — Moliyaga alohida xarajat
              sifatida yoziladi.
            </p>
            {extraExpenses.length > 0 && (
              <div className="space-y-3">
                {extraExpenses.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex gap-2">
                      <select
                        value={exp.expenseType}
                        onChange={(e) =>
                          updateExpenseRow(exp.id, { expenseType: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-white text-sm"
                      >
                        <option value="">Tur tanlang...</option>
                        {EXPENSE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number" onFocus={(e) => e.currentTarget.select()}
                        min={0}
                        placeholder="0"
                        value={exp.amountText}
                        onChange={(e) =>
                          updateExpenseRow(exp.id, { amountText: e.target.value })
                        }
                        className="w-32 px-3 py-2 rounded-xl border border-border bg-white text-sm"
                      />
                      <span className="px-2 py-2 text-sm font-semibold text-ink-soft shrink-0">
                        {currency}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExpenseRow(exp.id)}
                        className="text-ink-soft hover:text-danger shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {exp.expenseType === "Logistika" && (
                      <div className="mt-2 p-3 rounded-xl bg-white border border-border space-y-2 text-sm">
                        <div>
                          <label className="block text-xs text-ink-soft mb-1">Manzil</label>
                          <input
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Google Maps havolasi yoki taxminiy manzil (tuman, mahalla...)"
                            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-ink-soft mb-1">Haydovchi</label>
                          <select
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                          >
                            <option value="">— tanlang —</option>
                            {driversList.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                                {d.phone ? ` (${d.phone})` : ""}
                              </option>
                            ))}
                          </select>
                          {selectedDriver && (selectedDriver.phone || selectedDriver.carNumber) && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {selectedDriver.phone && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/15 text-xs font-medium text-ink">
                                  <Phone size={12} className="text-primary" /> {selectedDriver.phone}
                                </span>
                              )}
                              {selectedDriver.carNumber && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-border text-xs font-medium text-ink">
                                  <Car size={12} className="text-ink-soft" /> {selectedDriver.carNumber}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="mt-1.5">
                            <AddCounterpartyButton
                              defaultType="EMPLOYEE"
                              lockType
                              variant="link"
                              label="Yangi haydovchi"
                              title="Yangi haydovchi"
                              defaultPosition="Haydovchi"
                              onCreated={(party) => {
                                const nd: DriverOpt = {
                                  id: party.id,
                                  name: party.name,
                                  phone: party.phone,
                                  carNumber: party.carNumber,
                                };
                                setDriversList((prev) => [nd, ...prev]);
                                setDriverId(nd.id);
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-ink-soft mb-1">
                            Rejalashtirilgan sana
                          </label>
                          <input
                            type="date"
                            value={expectedDeliveryDate}
                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-ink-soft mb-1">
                              Qabul qiluvchi
                            </label>
                            <input
                              value={receiverName}
                              onChange={(e) => setReceiverName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-ink-soft mb-1">Telefon</label>
                            <input
                              value={receiverPhone}
                              onChange={(e) => setReceiverPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("FULL")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "FULL"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-sm">To'liq to'lov</p>
                  <p className="text-xs text-ink-soft">Bir martalik to'lov</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("PARTIAL")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "PARTIAL"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-sm">Zaklad</p>
                  <p className="text-xs text-ink-soft">Boshlang'ich to'lov</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("DEFERRED")}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentType === "DEFERRED"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-sm">Qarz</p>
                  <p className="text-xs text-ink-soft">Kelishilgan muddatda</p>
                </button>
              </div>

              {paymentType !== "DEFERRED" && (
                <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
                  <div>
                    {paymentType === "PARTIAL" && (
                      <>
                        <label className="block text-xs font-semibold text-primary uppercase mb-1">
                          Boshlang'ich to'lov
                        </label>
                        <input
                          type="number" onFocus={(e) => e.currentTarget.select()}
                          min={0}
                          max={grand}
                          placeholder="Mijoz to'lagan summa"
                          value={depositText}
                          onChange={(e) => setDepositText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-white mb-2"
                        />
                      </>
                    )}
                    <label className="block text-xs font-semibold text-primary uppercase mb-1">
                      To'lov qabul qilingan hisob
                    </label>
                    <p className="text-xs text-ink-soft normal-case font-normal mb-1.5">
                      Pul shu kassa/bank hisobiga tushadi — Moliyada balans shuncha oshadi.
                    </p>
                    <select
                      value={paymentAccountId}
                      onChange={(e) => setPaymentAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                    >
                      <option value="">— hisobni tanlang —</option>
                      {availableAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </select>
                    {availableAccounts.length === 0 && (
                      <p className="text-xs text-danger mt-1">
                        {currency} valyutasida faol hisob yo'q — avval Sozlamalardan qo'shing.
                      </p>
                    )}
                  </div>
                  {paymentType === "PARTIAL" && (
                    <div className="flex justify-between text-sm pt-1 border-t border-primary/15">
                      <span className="text-ink-soft">Qolgan qarz</span>
                      <span className="font-bold text-danger">
                        {formatMoney(remainingDebt, currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {paymentType === "DEFERRED" && (
                <p className="text-xs text-ink-soft mt-1.5">
                  Hech qanday to'lov olinmaydi — butun summa mijoz qarzi sifatida yoziladi.
                </p>
              )}
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
            {extraExpensesTotal > 0 && (
              <div className="flex justify-between pt-1">
                <span className="text-ink-soft">
                  Qo'shimcha xarajat
                  <span className="text-xs"> (jamiga kirmaydi)</span>
                </span>
                <span className="font-semibold text-ink-soft">
                  {formatMoney(extraExpensesTotal, currency)}
                </span>
              </div>
            )}
            {paymentType !== "DEFERRED" && (
              <div className="flex justify-between pt-1">
                <span className="text-ink-soft">
                  {paymentType === "FULL" ? "To'langan" : "Zaklad"}
                </span>
                <span className="font-semibold text-success">
                  {formatMoney(paidNow, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink-soft">Qarz qoladi</span>
              <span className={`font-semibold ${remainingDebt > 0 ? "text-danger" : "text-success"}`}>
                {formatMoney(remainingDebt, currency)}
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
