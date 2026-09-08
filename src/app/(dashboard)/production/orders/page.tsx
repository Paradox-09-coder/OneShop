"use client";

import { useState } from "react";
import SearchBar from "@/components/search-bar";
import Tabs from "@/components/tabs";
import Badge from "@/components/badge";
import Button from "@/components/button";
import { orders } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Plus, FlaskConical, Filter, SlidersHorizontal } from "lucide-react";

const statusTabs = [
  { label: "Все", value: "all" },
  { label: "Новые", value: "NEW" },
  { label: "В процессе", value: "IN_PROGRESS" },
  { label: "Полуфабрикаты", value: "SEMI_FINISHED" },
  { label: "Готовые", value: "COMPLETED" },
];

const priorityMap = {
  LOW: { label: "Низкий", color: "bg-blue-100 text-blue-700" },
  MEDIUM: { label: "Средний", color: "bg-amber-100 text-amber-700" },
  HIGH: { label: "Высокий", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Срочный", color: "bg-red-100 text-red-700" },
};

const statusLabels: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В процессе",
  SEMI_FINISHED: "Полуфабрикат",
  COMPLETED: "Готов",
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("all");

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.orderNumber.toLowerCase().includes(q) && !o.productName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">Заказы</h1>
        <div className="flex gap-3">
          <Button variant="outline">
            <FlaskConical size={18} />
            СИМУЛЯЦИЯ
          </Button>
          <Button variant="primary">
            <Plus size={18} />
            НОВЫЙ ЗАКАЗ
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 max-w-xl">
          <SearchBar placeholder="Поиск заказов... ⌘K" value={search} onChange={setSearch} />
        </div>
        <button className="p-3 rounded-xl border border-border bg-white hover:bg-gray-50">
          <Filter size={18} className="text-ink-soft" />
        </button>
        <button className="p-3 rounded-xl border border-border bg-white hover:bg-gray-50">
          <SlidersHorizontal size={18} className="text-ink-soft" />
        </button>
      </div>

      <Tabs tabs={statusTabs} active={statusFilter} onChange={setStatus} />

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="font-bold text-ink uppercase text-sm tracking-wider">
            Все заказы
          </h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Артикул</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Продукт</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Кол-во</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Приоритет</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Дата</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Срок сдачи</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Осталось</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Выполнено</th>
                <th className="text-center px-5 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Материалы</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const progress = order.quantity > 0 ? (order.completedQty / order.quantity) * 100 : 0;
                return (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-5 py-4 text-sm text-primary font-medium">{order.orderNumber}</td>
                    <td className="px-5 py-4 font-medium">{order.productName}</td>
                    <td className="px-5 py-4 text-center text-sm">{order.quantity} шт.</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${priorityMap[order.priority].color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {priorityMap[order.priority].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-ink-soft">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4 text-center text-sm text-ink-soft">{order.dueDate ? formatDate(order.dueDate) : "—"}</td>
                    <td className="px-5 py-4 text-center text-sm text-ink-soft">—</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-soft">{order.completedQty}/{order.quantity}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-ink-soft">—</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-ink-soft">
                    Заказы не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
