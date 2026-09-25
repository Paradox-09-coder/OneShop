"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  Search,
  Clock,
  User,
  X,
  Layers,
} from "lucide-react";
import { useDialog } from "@/components/use-dialog";
import Select from "@/components/select";

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number | null;
  basePriceCurrency: string;
  unitType: string;
  categoryId: string | null;
  stockQty: number;
}

interface Category {
  id: string;
  name: string;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
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
  clients: ClientOption[];
  accounts: { id: string; name: string; currency: string }[];
  recentOrders: RecentOrder[];
}

const ALL = "__all__";
const UNCATEGORIZED = "__uncategorized__";

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export default function PosClient({
  products,
  categories,
  walkInId,
  clients,
  accounts,
  recentOrders,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [lines, setLines] = useState<Line[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const { alert, Dialog } = useDialog();

  // Mijoz — standart "Mehmon mijoz" (walk-in), qidirib boshqasini tanlash mumkin
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientPanelOpen, setClientPanelOpen] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)
      )
      .slice(0, 8);
  }, [clients, clientQuery]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = p.categoryId ?? UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== ALL) {
        const key = p.categoryId ?? UNCATEGORIZED;
        if (key !== activeCategory) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    });
  }, [products, query, activeCategory]);

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
    const finalClientId = clientId ?? walkInId;
    if (!finalClientId) {
      alert("Walk-in mijoz topilmadi — seed skriptini ishga tushiring");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: finalClientId,
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
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_360px] gap-4 items-start">
      {/* Kategoriyalar — chapda */}
      <div className="panel p-2 space-y-1">
        <button
          onClick={() => setActiveCategory(ALL)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeCategory === ALL
              ? "bg-primary/10 text-primary"
              : "text-ink-soft hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers size={15} /> Barchasi
          </span>
          <span className="text-xs font-bold">{products.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeCategory === c.id
                ? "bg-primary/10 text-primary"
                : "text-ink-soft hover:bg-gray-50"
            }`}
          >
            <span className="truncate">{c.name}</span>
            <span className="text-xs font-bold shrink-0">
              {counts.get(c.id) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Mahsulotlar ro'yxati — o'rtada */}
      <div className="panel p-5">
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot, SKU yoki barcode..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white"
            autoFocus
          />
        </div>

        {recentOrders.length > 0 && !query && (
          <div className="mb-4">
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

        <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
          {visible.slice(0, 100).map((p) => {
            const outOfStock = p.stockQty <= 0;
            return (
              <button
                key={p.id}
                onClick={() => !outOfStock && add(p)}
                disabled={outOfStock}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-gray-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-ink-soft">
                    SKU {p.sku} ·{" "}
                    {outOfStock ? (
                      <span className="text-danger font-semibold">Tugagan</span>
                    ) : (
                      `${p.stockQty} ${p.unitType.toLowerCase()}`
                    )}
                  </p>
                </div>
                <p className="font-bold whitespace-nowrap">
                  {formatMoney(p.basePrice ?? 0, p.basePriceCurrency)}
                </p>
                <span
                  className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                    outOfStock
                      ? "bg-gray-100 text-ink-soft"
                      : "bg-primary text-white"
                  }`}
                >
                  <Plus size={16} />
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className="text-sm text-ink-soft text-center py-10">
              Mahsulot topilmadi
            </p>
          )}
        </div>
      </div>

      {/* Tranzaksiya — o'ngda */}
      <div className="panel p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Receipt size={18} /> Tranzaksiya
        </h3>

        <div className="relative mb-4">
          <div
            onClick={() => setClientPanelOpen((v) => !v)}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-white cursor-pointer hover:border-primary/50"
          >
            <User size={15} className="text-ink-soft shrink-0" />
            <span className="text-sm font-medium truncate flex-1">
              {selectedClient ? selectedClient.name : "Mehmon mijoz"}
            </span>
            {selectedClient && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setClientId(null);
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
              <div className="absolute left-0 right-0 top-12 z-30 panel p-2 max-h-72 overflow-y-auto">
                <input
                  autoFocus
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Ism yoki telefon..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm mb-1"
                />
                <button
                  onClick={() => {
                    setClientId(null);
                    setClientPanelOpen(false);
                    setClientQuery("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-semibold text-ink-soft"
                >
                  Mehmon mijoz (standart)
                </button>
                {clientMatches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClientId(c.id);
                      setClientPanelOpen(false);
                      setClientQuery("");
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
            </>
          )}
        </div>

        <div className="space-y-2 max-h-[30vh] overflow-y-auto mb-4">
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
              Mahsulot tanlang yoki SKU skanlang
              <br />
              <span className="text-xs">Bugungi birinchi sotuv</span>
            </p>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-xs text-ink-soft mb-1">
            Kassaga tushadi:
          </label>
          <Select
            value={accountId}
            onChange={setAccountId}
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${a.currency})`,
            }))}
          />
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
      {Dialog}
    </div>
  );
}
