"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { OrderStatus, OrderType, Currency } from "@prisma/client";
import { orderStatusLabel, orderStatusColor } from "@/lib/labels";
import { ALL_STAGES_ORDERED, canTransition } from "@/lib/state-machine";
import { formatMoney } from "@/lib/utils";
import { useDialog } from "@/components/use-dialog";

export interface KanbanOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  clientName: string;
  total: number;
  currency: Currency;
  // Serverda tayyor formatlangan matn — mijoz tomonida qayta
  // formatlash Intl/ICU farqidan hydration xatosiga olib kelishi mumkin
  // (server va brauzerning "uz-UZ" locale ma'lumotlari mos kelmasligi).
  createdAtLabel: string;
}

// Buyurtmalarni bosqich (status) bo'yicha ustunlarga ajratib, qo'lda
// ushlab boshqa ustunga tashlash orqali holatini o'zgartiradigan kanban.
// Ruxsat etilmagan o'tish (state-machine.ts) bo'lsa — serverga so'rov
// yuborilmasdan, darhol xato ko'rsatiladi.
export default function OrdersKanban({ orders }: { orders: KanbanOrder[] }) {
  const router = useRouter();
  const [items, setItems] = useState(orders);
  // Qidiruv/filtr o'zgarib, server yangi `orders` prop yuborsa — mahalliy
  // holatni shu bilan sinxronlaymiz (aks holda eski ro'yxat qolib ketardi).
  useEffect(() => setItems(orders), [orders]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);
  const [, startTransition] = useTransition();
  const { alert, Dialog } = useDialog();

  const columns = ALL_STAGES_ORDERED.map((status) => ({
    status,
    orders: items.filter((o) => o.status === status),
  }));

  async function handleDrop(targetStatus: OrderStatus) {
    setDragOverStatus(null);
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;
    const order = items.find((o) => o.id === id);
    if (!order || order.status === targetStatus) return;

    if (!canTransition(order.type, order.status, targetStatus)) {
      alert(
        `"${orderStatusLabel[order.status]}" holatidan "${orderStatusLabel[targetStatus]}" holatiga to'g'ridan-to'g'ri o'tib bo'lmaydi.`
      );
      return;
    }

    const prevStatus = order.status;
    setItems((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: targetStatus } : o))
    );

    try {
      const res = await fetch(`/api/orders/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: targetStatus }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "Xatolik");
      startTransition(() => router.refresh());
    } catch (e) {
      // Rad etilsa — orqaga qaytaramiz
      setItems((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: prevStatus } : o))
      );
      alert(e instanceof Error ? e.message : "Holatni o'zgartirib bo'lmadi");
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      {Dialog}
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => {
          const columnTotal = col.orders.reduce((s, o) => s + o.total, 0);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.status);
              }}
              className={`w-80 flex-shrink-0 panel p-3 transition-colors ${
                dragOverStatus === col.status ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1 px-1">
                <span className={`chip ${orderStatusColor[col.status]}`}>
                  {orderStatusLabel[col.status]}
                </span>
                <span className="text-xs font-bold text-ink-soft bg-gray-100 rounded-full px-2 py-0.5">
                  {col.orders.length}
                </span>
              </div>
              <p className="text-xs text-ink-soft px-1 mb-3 font-semibold">
                {formatMoney(columnTotal, "UZS")}
              </p>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                {col.orders.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => setDraggingId(o.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`p-3 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-border cursor-grab active:cursor-grabbing transition ${
                      draggingId === o.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/buyurtmalar/${o.id}`}
                      className="text-xs font-semibold text-primary"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-sm font-semibold mt-0.5 truncate">
                      {o.clientName}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-ink-soft">
                        {o.createdAtLabel}
                      </span>
                      <span className="text-sm font-bold whitespace-nowrap">
                        {formatMoney(o.total, o.currency)}
                      </span>
                    </div>
                  </div>
                ))}
                {col.orders.length === 0 && (
                  <p className="text-xs text-ink-soft text-center py-6">Bo'sh</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
