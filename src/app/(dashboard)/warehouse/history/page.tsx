"use client";

import { useState } from "react";
import SearchBar from "@/components/search-bar";
import Badge from "@/components/badge";
import { formatDateTime } from "@/lib/utils";

const historyItems = [
  { id: "1", material: "Материал 58", type: "OUT" as const, amount: 3.65, unit: "metr", order: "PO-95993", note: "Nur red uchun", date: "2026-08-28T14:30:00" },
  { id: "2", material: "Материал 122", type: "OUT" as const, amount: 2.4, unit: "metr", order: "PO-95993", note: "Nur red uchun", date: "2026-08-28T14:30:00" },
  { id: "3", material: "Материал 17", type: "IN" as const, amount: 50, unit: "metr", order: null, note: "Yangi partiya", date: "2026-08-27T10:00:00" },
  { id: "4", material: "Нить белая", type: "IN" as const, amount: 20, unit: "dona", order: null, note: "Qo'shimcha buyurtma", date: "2026-08-26T09:15:00" },
  { id: "5", material: "Материал 49", type: "WASTE" as const, amount: 1.2, unit: "metr", order: null, note: "Nuqsonli", date: "2026-08-25T16:45:00" },
];

const typeMap = {
  IN: { label: "Приход", variant: "success" as const },
  OUT: { label: "Расход", variant: "danger" as const },
  WASTE: { label: "Отход", variant: "warning" as const },
  ADJUSTMENT: { label: "Корректировка", variant: "primary" as const },
};

export default function HistoryPage() {
  const [search, setSearch] = useState("");

  const filtered = search
    ? historyItems.filter((h) =>
        h.material.toLowerCase().includes(search.toLowerCase()) ||
        (h.order && h.order.toLowerCase().includes(search.toLowerCase()))
      )
    : historyItems;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">История обработки</h1>

      <div className="max-w-2xl mb-6">
        <SearchBar placeholder="Поиск по материалу или заказу..." value={search} onChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Дата/Время</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Материал</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Тип</th>
              <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Кол-во</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Заказ</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Примечание</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-ink-soft">{formatDateTime(item.date)}</td>
                <td className="px-6 py-4 font-medium">{item.material}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={typeMap[item.type].variant}>{typeMap[item.type].label}</Badge>
                </td>
                <td className="px-6 py-4 text-right font-bold">
                  <span className={item.type === "IN" ? "text-success" : item.type === "OUT" ? "text-danger" : "text-warning"}>
                    {item.type === "IN" ? "+" : "-"}{item.amount}
                  </span>
                  <span className="text-xs text-ink-soft ml-1">{item.unit}</span>
                </td>
                <td className="px-6 py-4 text-sm text-primary">{item.order || "—"}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
