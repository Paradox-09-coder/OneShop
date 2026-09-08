"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Tabs from "@/components/tabs";
import Badge from "@/components/badge";
import Button from "@/components/button";
import { materials, materialCategories, warehouses } from "@/lib/mock-data";
import { Plus, SlidersHorizontal, Filter } from "lucide-react";

const typeTabs = [
  { label: "ОДЕЖДА", value: "ODEJDA" },
  { label: "POS", value: "POS" },
];

export default function RawMaterialsPage() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouse] = useState("Все");
  const [categoryFilter, setCategory] = useState("Все");
  const [typeFilter, setType] = useState("ODEJDA");

  const today = new Date();
  const dateStr = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filtered = useMemo(() => {
    let list = materials;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.artikul.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "Все") {
      list = list.filter((m) => m.category === categoryFilter);
    }
    if (warehouseFilter !== "Все") {
      list = list.filter((m) => m.warehouse === warehouseFilter);
    }
    return list;
  }, [search, categoryFilter, warehouseFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof materials> = {};
    filtered.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Сырьё</h1>
          <p className="text-ink-soft text-sm mt-1">
            СЕГОДНЯ | {dateStr.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" size="md">
            🗑 ОТХОДЫ
          </Button>
          <Button variant="primary" size="md">
            <Plus size={18} />
            ДОБАВИТЬ
          </Button>
        </div>
      </div>

      <Tabs
        tabs={warehouses.map((w) => ({ label: w, value: w }))}
        active={warehouseFilter}
        onChange={setWarehouse}
      />

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {typeTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                typeFilter === t.value
                  ? "bg-white border-border text-ink shadow-sm"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Tabs
          tabs={materialCategories.map((c) => ({ label: c, value: c }))}
          active={categoryFilter}
          onChange={setCategory}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar
            placeholder="Поиск материалов... ⌘K"
            value={search}
            onChange={setSearch}
          />
        </div>
        <button className="p-3 rounded-xl border border-border bg-white hover:bg-gray-50">
          <Filter size={18} className="text-ink-soft" />
        </button>
        <button className="p-3 rounded-xl border border-border bg-white hover:bg-gray-50">
          <SlidersHorizontal size={18} className="text-ink-soft" />
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-bold text-ink">{category}</span>
              </div>
              <span className="text-xs text-ink-soft uppercase tracking-wider">
                {items.length} позиций
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                      Товар
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                      Свойства
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">
                      Количество
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((mat) => (
                    <tr
                      key={mat.id}
                      className="border-b border-border/50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {mat.imageUrl ? (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0" />
                          ) : null}
                          <div>
                            <p className="font-medium text-ink">{mat.name}</p>
                            <p className="text-xs text-primary">#{mat.artikul}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {mat.properties?.density && (
                          <Badge>{mat.properties.density}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-lg font-bold ${
                            mat.quantity <= mat.minQuantity
                              ? "text-danger"
                              : "text-ink"
                          }`}
                        >
                          {mat.quantity}
                        </span>
                        <span className="text-xs text-ink-soft ml-2 uppercase">
                          {mat.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
