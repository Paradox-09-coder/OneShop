"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { unitTypeLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import type { UnitType, Currency } from "@prisma/client";
import { Plus, Pencil, Trash2, X, Utensils } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitType: UnitType;
  baseCost: number | null;
  baseCostCurrency: Currency;
  basePrice: number | null;
  basePriceCurrency: Currency;
  color: string | null;
  lowStockThreshold: number;
  isSellable: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Draft {
  id?: string;
  sku: string;
  name: string;
  categoryId: string;
  unitType: UnitType;
  baseCost: number;
  basePrice: number;
  baseCurrency: Currency;
  color: string;
  lowStockThreshold: number;
  isSellable: boolean;
}

const EMPTY: Draft = {
  sku: "",
  name: "",
  categoryId: "",
  unitType: "DONA",
  baseCost: 0,
  basePrice: 0,
  baseCurrency: "UZS",
  color: "",
  lowStockThreshold: 5,
  isSellable: true,
};

interface Props {
  products: Product[];
  categories: Category[];
  defaultCategoryId?: string;
}

export default function ProductManager({ products, categories, defaultCategoryId }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setDraft({ ...EMPTY, categoryId: defaultCategoryId ?? categories[0]?.id ?? "" });
    setErr(null);
  }

  function openEdit(p: Product) {
    setDraft({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId ?? "",
      unitType: p.unitType,
      baseCost: p.baseCost ?? 0,
      basePrice: p.basePrice ?? 0,
      baseCurrency: p.basePriceCurrency,
      color: p.color ?? "",
      lowStockThreshold: p.lowStockThreshold,
      isSellable: p.isSellable,
    });
    setErr(null);
  }

  async function save() {
    if (!draft) return;
    if (!draft.sku.trim()) return setErr("SKU kerak");
    if (!draft.name.trim()) return setErr("Nomi kerak");
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        sku: draft.sku,
        name: draft.name,
        categoryId: draft.categoryId || null,
        unitType: draft.unitType,
        baseCost: draft.baseCost || null,
        basePrice: draft.basePrice || null,
        baseCurrency: draft.baseCurrency,
        color: draft.color || null,
        lowStockThreshold: draft.lowStockThreshold,
        isSellable: draft.isSellable,
      };
      const res = draft.id
        ? await fetch(`/api/catalog-products/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/catalog-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await res.json();
      if (!d.ok) return setErr(d.error?.message ?? "Xato");
      setDraft(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`"${name}" mahsulotini o'chirmoqchimisiz?`)) return;
    const res = await fetch(`/api/catalog-products/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.ok) return alert(d.error?.message ?? "Xato");
    router.refresh();
  }

  return (
    <div className="panel overflow-hidden">
      <div className="p-3 border-b border-border flex justify-between items-center gap-2">
        <h3 className="font-bold px-2">Mahsulotlar ({products.length})</h3>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
        >
          <Plus size={14} /> Yangi mahsulot
        </button>
      </div>

      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-left px-4 py-3">Nomi</th>
              <th className="text-left px-4 py-3">Kategoriya</th>
              <th className="text-left px-4 py-3">Turi</th>
              <th className="text-left px-4 py-3">Birligi</th>
              <th className="text-right px-4 py-3">Tannarx</th>
              <th className="text-right px-4 py-3">Narx</th>
              <th className="text-right px-4 py-3">Amal</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-ink-soft font-mono text-xs">
                  {p.sku}
                </td>
                <td className="px-4 py-2.5 font-semibold">{p.name}</td>
                <td className="px-4 py-2.5">{p.categoryName ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {p.isSellable ? (
                    <span className="chip bg-emerald-100 text-emerald-700">Sotiladi</span>
                  ) : (
                    <span className="chip bg-amber-100 text-amber-700">Xomashyo</span>
                  )}
                </td>
                <td className="px-4 py-2.5">{unitTypeLabel[p.unitType]}</td>
                <td className="px-4 py-2.5 text-right">
                  {p.baseCost != null ? formatMoney(p.baseCost, p.baseCostCurrency) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">
                  {p.basePrice != null ? formatMoney(p.basePrice, p.basePriceCurrency) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <Link
                    href={`/katalog/${p.id}/recipe`}
                    className="inline-block p-1.5 rounded-lg hover:bg-gray-100 text-warning"
                    title="Retsept (BOM)"
                  >
                    <Utensils size={14} />
                  </Link>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id, p.name)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                {draft.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
              </h3>
              <button
                onClick={() => setDraft(null)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-ink-soft mb-1">SKU *</label>
                  <input
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white font-mono text-sm"
                    placeholder="GEN-3000"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Birligi</label>
                  <select
                    value={draft.unitType}
                    onChange={(e) =>
                      setDraft({ ...draft, unitType: e.target.value as UnitType })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
                  >
                    <option value="DONA">dona</option>
                    <option value="METR">metr</option>
                    <option value="M2">m²</option>
                    <option value="MM">mm</option>
                    <option value="KG">kg</option>
                    <option value="LITR">litr</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-soft mb-1">Nomi *</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  placeholder="Generator 3kW benzin"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-soft mb-1">Kategoriya</label>
                <select
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                >
                  <option value="">— tanlang —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Tannarx</label>
                  <input
                    type="number" onFocus={(e) => e.currentTarget.select()}
                    value={draft.baseCost}
                    onChange={(e) =>
                      setDraft({ ...draft, baseCost: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Narx</label>
                  <input
                    type="number" onFocus={(e) => e.currentTarget.select()}
                    value={draft.basePrice}
                    onChange={(e) =>
                      setDraft({ ...draft, basePrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Valyuta</label>
                  <select
                    value={draft.baseCurrency}
                    onChange={(e) =>
                      setDraft({ ...draft, baseCurrency: e.target.value as Currency })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  >
                    <option value="UZS">so'm</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                    <option value="RUB">₽</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-soft mb-1">
                  Kam qoldiq chegarasi (kam qoldiq belgisi uchun)
                </label>
                <input
                  type="number" onFocus={(e) => e.currentTarget.select()}
                  value={draft.lowStockThreshold}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lowStockThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                />
              </div>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isSellable}
                  onChange={(e) =>
                    setDraft({ ...draft, isSellable: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  <span className="font-semibold">Mijozga sotiladi</span>
                  <br />
                  <span className="text-xs text-ink-soft">
                    O'chirilsa — bu mahsulot faqat Retsept (BOM) xomashyosi
                    sifatida ishlatiladi, "Yangi buyurtma" va "Kassa"
                    ro'yxatida ko'rinmaydi.
                  </span>
                </span>
              </label>
              {err && (
                <div className="p-2 rounded-lg bg-danger-light/30 text-danger text-sm">
                  {err}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDraft(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "..." : "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
