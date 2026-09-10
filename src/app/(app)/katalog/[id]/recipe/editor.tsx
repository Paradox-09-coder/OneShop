"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatNumber } from "@/lib/utils";
import { unitTypeLabel } from "@/lib/labels";
import type { UnitType, Currency } from "@prisma/client";
import { Plus, Pencil, Trash2, X, Utensils, Calculator } from "lucide-react";

interface Material {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  cost: number;
  costCurrency: Currency;
}

interface Ingredient {
  id?: string;
  materialProductId: string;
  materialName: string;
  materialSku: string;
  quantity: number;
  unit: UnitType;
  wastePercent: number;
  cost: number;
  costCurrency: Currency;
}

interface Recipe {
  id: string;
  variantName: string;
  outputQty: number;
  outputUnit: UnitType;
  laborCost: number | null;
  note: string | null;
  isActive: boolean;
  ingredients: Ingredient[];
}

interface Draft {
  id?: string;
  variantName: string;
  outputQty: number;
  outputUnit: UnitType;
  laborCost: number;
  note: string;
  ingredients: Ingredient[];
}

interface Props {
  productId: string;
  recipes: Recipe[];
  materials: Material[];
}

export default function RecipeEditor({ productId, recipes, materials }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openNew() {
    setDraft({
      variantName: "Standart",
      outputQty: 1,
      outputUnit: "DONA",
      laborCost: 3000,
      note: "",
      ingredients: [],
    });
  }

  function openEdit(r: Recipe) {
    setDraft({
      id: r.id,
      variantName: r.variantName,
      outputQty: r.outputQty,
      outputUnit: r.outputUnit,
      laborCost: r.laborCost ?? 0,
      note: r.note ?? "",
      ingredients: r.ingredients.map((it) => ({ ...it })),
    });
  }

  function addIngredient() {
    if (!draft) return;
    const first = materials[0];
    if (!first) return;
    setDraft({
      ...draft,
      ingredients: [
        ...draft.ingredients,
        {
          materialProductId: first.id,
          materialName: first.name,
          materialSku: first.sku,
          quantity: 1,
          unit: first.unit,
          wastePercent: 0,
          cost: first.cost,
          costCurrency: first.costCurrency,
        },
      ],
    });
  }

  function updateIngredient(i: number, patch: Partial<Ingredient>) {
    if (!draft) return;
    setDraft({
      ...draft,
      ingredients: draft.ingredients.map((it, idx) =>
        idx === i ? { ...it, ...patch } : it
      ),
    });
  }

  function removeIngredient(i: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      ingredients: draft.ingredients.filter((_, idx) => idx !== i),
    });
  }

  function changeMaterial(i: number, id: string) {
    const m = materials.find((x) => x.id === id);
    if (!m) return;
    updateIngredient(i, {
      materialProductId: m.id,
      materialName: m.name,
      materialSku: m.sku,
      unit: m.unit,
      cost: m.cost,
      costCurrency: m.costCurrency,
    });
  }

  async function save() {
    if (!draft) return;
    if (draft.ingredients.length === 0) return setErr("Kamida bitta xomashyo qo'shing");
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        catalogProductId: productId,
        variantName: draft.variantName,
        outputQty: draft.outputQty,
        outputUnit: draft.outputUnit,
        laborCost: draft.laborCost || null,
        note: draft.note || undefined,
        ingredients: draft.ingredients.map((it) => ({
          materialProductId: it.materialProductId,
          quantity: it.quantity,
          unit: it.unit,
          wastePercent: it.wastePercent,
        })),
      };
      const res = draft.id
        ? await fetch(`/api/recipes/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!data.ok) return setErr(data.error?.message ?? "Xato");
      setDraft(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`"${name}" retseptini o'chirmoqchimisiz?`)) return;
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.ok) return alert(d.error?.message ?? "Xato");
    router.refresh();
  }

  function calcCost(r: Recipe | Draft): number {
    let total = 0;
    for (const it of r.ingredients) {
      const withWaste = it.quantity * (1 + it.wastePercent / 100);
      total += withWaste * it.cost;
    }
    return total + (r.laborCost ?? 0);
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
        >
          <Plus size={16} /> Yangi retsept variant
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-ink-soft mb-4">
            <Utensils size={22} />
          </div>
          <h3 className="font-semibold">Retsept yo'q</h3>
          <p className="text-sm text-ink-soft mt-1">
            Bu mahsulotga xomashyo bog'lash uchun retsept qo'shing
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recipes.map((r) => {
            const cost = calcCost(r);
            return (
              <div key={r.id} className="panel p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{r.variantName}</h3>
                    <p className="text-sm text-ink-soft">
                      Chiqarish: {r.outputQty} {unitTypeLabel[r.outputUnit]} •
                      Ish haqi: {formatMoney(r.laborCost ?? 0, "UZS")}/dona
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="chip bg-primary/10 text-primary py-1 px-3">
                      <Calculator size={12} />
                      <span className="font-bold ml-1">
                        Tannarx: {formatMoney(cost, "UZS")}
                      </span>
                    </div>
                    <button
                      onClick={() => openEdit(r)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(r.id, r.variantName)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-soft uppercase border-b border-border">
                      <th className="text-left py-2">Xomashyo</th>
                      <th className="text-right py-2">Miqdor</th>
                      <th className="text-right py-2">Chiqindi %</th>
                      <th className="text-right py-2">Tannarx/birlik</th>
                      <th className="text-right py-2">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ingredients.map((it) => {
                      const withWaste = it.quantity * (1 + it.wastePercent / 100);
                      return (
                        <tr key={it.id ?? it.materialProductId} className="border-b border-border/50">
                          <td className="py-2">
                            <span className="font-semibold">{it.materialName}</span>{" "}
                            <span className="text-xs text-ink-soft font-mono">
                              ({it.materialSku})
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {formatNumber(withWaste)} {unitTypeLabel[it.unit]}
                          </td>
                          <td className="py-2 text-right">
                            {it.wastePercent > 0 ? `+${it.wastePercent}%` : "—"}
                          </td>
                          <td className="py-2 text-right">
                            {formatMoney(it.cost, it.costCurrency)}
                          </td>
                          <td className="py-2 text-right font-semibold">
                            {formatMoney(withWaste * it.cost, "UZS")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-fadeIn my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                {draft.id ? "Retseptni tahrirlash" : "Yangi retsept"}
              </h3>
              <button
                onClick={() => setDraft(null)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Variant nomi</label>
                  <input
                    value={draft.variantName}
                    onChange={(e) => setDraft({ ...draft, variantName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                    placeholder="Standart"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Chiqarish (miqdor)</label>
                  <input
                    type="number"
                    value={draft.outputQty}
                    onChange={(e) =>
                      setDraft({ ...draft, outputQty: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Ish haqi (so'm/dona)</label>
                  <input
                    type="number"
                    value={draft.laborCost}
                    onChange={(e) =>
                      setDraft({ ...draft, laborCost: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-white"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Xomashyo tarkibi</h4>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Xomashyo qo'shish
                  </button>
                </div>

                {draft.ingredients.length === 0 ? (
                  <p className="text-sm text-ink-soft text-center py-4">Bo'sh</p>
                ) : (
                  <div className="space-y-2">
                    {draft.ingredients.map((it, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-gray-50"
                      >
                        <select
                          value={it.materialProductId}
                          onChange={(e) => changeMaterial(i, e.target.value)}
                          className="col-span-5 px-2 py-1.5 rounded-lg border border-border bg-white text-sm"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.sku})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) =>
                            updateIngredient(i, { quantity: Number(e.target.value) })
                          }
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-border bg-white text-sm"
                          placeholder="miqdor"
                        />
                        <span className="col-span-1 text-xs text-ink-soft">
                          {unitTypeLabel[it.unit]}
                        </span>
                        <input
                          type="number"
                          value={it.wastePercent}
                          onChange={(e) =>
                            updateIngredient(i, {
                              wastePercent: Number(e.target.value),
                            })
                          }
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-border bg-white text-sm"
                          placeholder="chiq %"
                        />
                        <span className="col-span-1 text-xs">%</span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(i)}
                          className="col-span-1 p-1 rounded-lg text-danger hover:bg-white"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {draft.ingredients.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex justify-between">
                    <span className="text-sm text-ink-soft">Hisoblangan tannarx:</span>
                    <span className="font-bold text-primary">
                      {formatMoney(calcCost(draft), "UZS")}
                    </span>
                  </div>
                )}
              </div>

              <textarea
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Izoh (ixtiyoriy)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />

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
