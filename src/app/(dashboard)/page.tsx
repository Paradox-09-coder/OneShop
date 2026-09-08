"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Tabs from "@/components/tabs";
import { products, productColors } from "@/lib/mock-data";
import { Package } from "lucide-react";

const viewTabs = [
  { label: "Все", value: "all" },
  { label: "Склад", value: "warehouse" },
  { label: "Магазин", value: "store" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.artikul.toLowerCase().includes(q)
      );
    }
    if (colorFilter !== "all") {
      list = list.filter((p) => p.color === colorFilter);
    }
    return list;
  }, [search, colorFilter]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Главная</h1>

      <Tabs tabs={viewTabs} active={view} onChange={setView} />

      <div className="mt-6 max-w-2xl">
        <SearchBar placeholder="Поиск... ⌘K" value={search} onChange={setSearch} />
      </div>

      <div className="mt-4">
        <Tabs
          tabs={productColors.map((c) => ({ label: c.label, value: c.value }))}
          active={colorFilter}
          onChange={setColorFilter}
          variant="outline"
        />
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                Название
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                Ед. изм.
              </th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                Магазин
              </th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                Осталось
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border/50 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Package size={20} className="text-ink-soft" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="text-xs text-primary">#{product.artikul}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{product.unit}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={
                      product.storeQty === 0
                        ? "text-lg font-bold text-danger"
                        : "text-lg font-bold text-ink"
                    }
                  >
                    {product.storeQty}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-ink-soft">
                  {product.remaining !== null ? product.remaining : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-ink-soft">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
