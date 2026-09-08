"use client";

import { useState } from "react";
import SearchBar from "@/components/search-bar";
import Tabs from "@/components/tabs";
import Badge from "@/components/badge";

const statusTabs = [
  { label: "Все", value: "all" },
  { label: "В ожидании", value: "pending" },
  { label: "Готовы к сборке", value: "ready" },
];

const semiProducts = [
  { id: "1", name: "Nur red — крой", order: "PO-95993", qty: 15, status: "ready", date: "2026-08-28" },
  { id: "2", name: "AYNA gorox — крой", order: "PO-95994", qty: 10, status: "pending", date: "2026-08-27" },
];

export default function SemiPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = semiProducts.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Полуфабрикаты</h1>
      <Tabs tabs={statusTabs} active={status} onChange={setStatus} />
      <div className="mt-5 max-w-xl">
        <SearchBar placeholder="Поиск..." value={search} onChange={setSearch} />
      </div>
      <div className="mt-6 bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Название</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Заказ</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Кол-во</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Статус</th>
              <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium">{item.name}</td>
                <td className="px-6 py-4 text-sm text-primary">{item.order}</td>
                <td className="px-6 py-4 text-center font-bold">{item.qty} шт.</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={item.status === "ready" ? "success" : "warning"}>
                    {item.status === "ready" ? "Готов" : "В ожидании"}
                  </Badge>
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
