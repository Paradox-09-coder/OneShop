"use client";

import { useState } from "react";
import SearchBar from "@/components/search-bar";
import Badge from "@/components/badge";
import Button from "@/components/button";
import { Plus } from "lucide-react";

const receivingItems = [
  { id: "1", product: "Nur red", order: "PO-95993", qty: 5, receivedQty: 5, date: "2026-08-29", status: "accepted" },
  { id: "2", product: "Nur red", order: "PO-95993", qty: 10, receivedQty: 10, date: "2026-08-28", status: "accepted" },
];

export default function ReceivingPage() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">Приёмка</h1>
        <Button variant="primary">
          <Plus size={18} />
          НОВАЯ ПРИЁМКА
        </Button>
      </div>

      <div className="max-w-xl mb-6">
        <SearchBar placeholder="Поиск..." value={search} onChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Продукт</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Заказ</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Заказано</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Принято</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Статус</th>
              <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Дата</th>
            </tr>
          </thead>
          <tbody>
            {receivingItems.map((item) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium">{item.product}</td>
                <td className="px-6 py-4 text-sm text-primary">{item.order}</td>
                <td className="px-6 py-4 text-center">{item.qty} шт.</td>
                <td className="px-6 py-4 text-center font-bold text-success">{item.receivedQty} шт.</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="success">Принят</Badge>
                </td>
                <td className="px-6 py-4 text-right text-sm text-ink-soft">{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
