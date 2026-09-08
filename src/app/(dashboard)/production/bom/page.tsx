"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Button from "@/components/button";
import { bomModels } from "@/lib/mock-data";
import { Plus, FileDown, Package, Info, SlidersHorizontal } from "lucide-react";

export default function BomPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return bomModels;
    const q = search.toLowerCase();
    return bomModels.filter(
      (b) => b.name.toLowerCase().includes(q) || b.artikul.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">Состав модели (BOM)</h1>
        <div className="flex gap-3">
          <Button variant="outline">
            <FileDown size={18} />
            EXCELGA EKSPORT ({bomModels.length})
          </Button>
          <Button variant="primary">
            <Plus size={18} />
            НОВАЯ МОДЕЛЬ
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 max-w-xl">
          <SearchBar placeholder="Поиск BOM... ⌘K" value={search} onChange={setSearch} />
        </div>
        <button className="p-3 rounded-xl border border-border bg-white hover:bg-gray-50">
          <SlidersHorizontal size={18} className="text-ink-soft" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((model) => (
          <div
            key={model.id}
            className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Package size={48} className="text-gray-300" />
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-ink">{model.name}</h3>
                <Info size={14} className="text-ink-soft" />
              </div>
              <p className="text-xs text-ink-soft mb-2">Артикул {model.artikul}</p>

              <div className="mb-3">
                <span className="text-xs text-ink-soft">МОЖНО ИЗГОТОВИТЬ</span>
                <p className={`text-lg font-bold ${model.canProduce > 0 ? "text-success" : "text-danger"}`}>
                  {model.canProduce > 0 ? `● ${model.canProduce} шт.` : "● 0 шт."}
                </p>
              </div>

              <div className="space-y-1.5">
                {model.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-ink-soft">{item.materialName}</span>
                    <span className="text-ink font-medium">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
                {model.items.length > 3 && (
                  <p className="text-xs text-primary">+{model.items.length - 3} Ещё</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
