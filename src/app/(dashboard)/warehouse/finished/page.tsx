"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Tabs from "@/components/tabs";
import Button from "@/components/button";
import { products, warehouses } from "@/lib/mock-data";
import { Plus, Package } from "lucide-react";

export default function FinishedProductsPage() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouse] = useState("Все");

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.artikul.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">Готовая продукция</h1>
        <Button variant="primary">
          <Plus size={18} />
          ДОБАВИТЬ
        </Button>
      </div>

      <Tabs
        tabs={warehouses.map((w) => ({ label: w, value: w }))}
        active={warehouseFilter}
        onChange={setWarehouse}
      />

      <div className="mt-5 max-w-2xl">
        <SearchBar placeholder="Поиск продуктов... ⌘K" value={search} onChange={setSearch} />
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Продукт</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Артикул</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">На складе</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Ед. изм.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package size={18} className="text-ink-soft" />
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-primary">#{p.artikul}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-lg font-bold ${p.storeQty === 0 ? "text-danger" : "text-ink"}`}>
                    {p.storeQty}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm text-ink-soft">{p.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
