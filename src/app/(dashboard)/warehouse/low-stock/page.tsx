"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Badge from "@/components/badge";
import { materials } from "@/lib/mock-data";

export default function LowStockPage() {
  const [search, setSearch] = useState("");

  const lowStock = useMemo(() => {
    let list = materials.filter((m) => m.quantity <= m.minQuantity);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.artikul.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof materials> = {};
    lowStock.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [lowStock]);

  return (
    <div>
      <div className="max-w-3xl">
        <SearchBar placeholder="Поиск продуктов... ⌘K" value={search} onChange={setSearch} />
      </div>

      <div className="mt-6 space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <span className="font-bold text-ink">{category}</span>
              <span className="bg-danger/10 text-danger text-xs font-bold px-2.5 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Продукт</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Свойства</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">На складе</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Ед. изм.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((mat) => (
                  <tr key={mat.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {mat.imageUrl && (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-ink">{mat.name}</p>
                          <p className="text-xs text-primary">#{mat.artikul}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {mat.properties?.density && <Badge>{mat.properties.density}</Badge>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 text-danger font-bold">
                        {mat.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-ink-soft uppercase">{mat.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-ink-soft">
            Все материалы в достатке!
          </div>
        )}
      </div>
    </div>
  );
}
