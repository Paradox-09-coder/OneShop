"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { Plus, Minus, Trash2, Receipt, Search, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useDialog } from "@/components/use-dialog";

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number | null;
  basePriceCurrency: string;
  unitType: string;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Line {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface RecentOrderItem {
  catalogProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
interface RecentOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  createdAt: string;
  items: RecentOrderItem[];
}

interface Props {
  products: Product[];
  categories: Category[];
  walkInId: string | null;
  accounts: { id: string; name: string; currency: string }[];
  recentOrders: RecentOrder[];
}

const UNCATEGORIZED = "__uncategorized__";

export default function PosClient({
  products,
  categories,
  walkInId,
  accounts,
  recentOrders,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const { alert, Dialog } = useDialog();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      // First category open by default
      const first = categories[0]?.id;
      return first ? { [first]: true } : {};
    }
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)
        )
      : products;

    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.categoryId ?? UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [products, query]);

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  function toggleCat(id: string) {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

  function copyFrom(order: RecentOrder) {
    setLines(
      order.items.map((it) => ({
        id: it.catalogProductId,
        name: it.productName,
        quantity: it.quantity,
        price: it.unitPrice,
      }))
    );
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

  const categoryNameMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Mahsulotlar (kategoriya bo'yicha collapsed) */}
      <div className="lg:col-span-2 panel p-5">
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot qidirish yoki SKU..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white"
            autoFocus
          />
        </div>

        {/* Oxirgi 3 sotuv — qidiruv va kategoriyalar orasida */}
        {recentOrders.length > 0 && !query && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2 text-xs text-ink-soft font-semibold uppercase">
              <Clock size={12} /> Oxirgi sotuvlar (bosing → nusxa)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentOrders.slice(0, 3).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => copyFrom(o)}
                  className="text-left p-2 rounded-xl border border-border bg-white hover:bg-primary/5 hover:border-primary transition"
                  title={`${o.items.map((i) => i.productName).join(", ")} — bosib chekka nusxa`}
                >
                  <p className="text-xs font-mono text-primary truncate">
                    {o.orderNumber}
                  </p>
                  <p className="text-xs text-ink-soft truncate">
                    {o.items.length} ta mahsulot
                  </p>
                  <p className="text-sm font-bold">
                    {formatMoney(o.amount, o.currency)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {Array.from(grouped.entries()).map(([catId, catProducts]) => {
            const isOpen = query ? true : openCategories[catId] ?? false;
            const name =
              categoryNameMap[catId] ??
              (catId === UNCATEGORIZED ? "Kategoriyasiz" : "Boshqa");
            return (
              <div
                key={catId}
                className="rounded-xl border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCat(catId)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown size={16} className="text-ink-soft" />
                    ) : (
                      <ChevronRight size={16} className="text-ink-soft" />
                    )}
                    <span className="font-semibold text-sm">{name}</span>
                  </div>
                  <span className="chip bg-white text-ink-soft">
                    {catProducts.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
                    {catProducts.slice(0, query ? 60 : 30).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => add(p)}
                        className="text-left p-3 rounded-xl border border-border bg-white hover:bg-primary/5 hover:border-primary transition"
                      >
                        <p className="font-semibold text-sm line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-xs text-ink-soft mt-1 font-mono">
                          {p.sku}
                        </p>
                        <p className="font-bold text-primary mt-1">
                          {formatMoney(p.basePrice ?? 0, p.basePriceCurrency)}
                        </p>
                      </button>
                    ))}
                    {catProducts.length > (query ? 60 : 30) && (
                      <p className="col-span-full text-xs text-ink-soft text-center py-2">
                        Yana {catProducts.length - (query ? 60 : 30)} ta —
                        qidiruvni ishlating
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {grouped.size === 0 && (
            <p className="text-sm text-ink-soft text-center py-10">
              Mahsulot topilmadi
            </p>
          )}
        </div>
      </div>

      {/* Chek + Oxirgi 5 buyurtma */}
      <div className="space-y-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Receipt size={18} /> Chek ({lines.length})
          </h3>
          <div className="space-y-2 max-h-[35vh] overflow-y-auto mb-4">
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
                  {a.name} ({a.currency})
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
      {Dialog}
    </div>
  );
}
