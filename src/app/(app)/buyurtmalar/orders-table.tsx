"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Columns3, Download } from "lucide-react";
import type { OrderStatus, OrderType, OrderPriority, Currency } from "@prisma/client";
import { orderStatusLabel, orderStatusColor, orderTypeLabel, orderPriorityLabel, orderPriorityColor } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/utils";
import ClickableRow from "@/components/clickable-row";
import EmptyState from "@/components/empty-state";
import { ShoppingCart } from "lucide-react";

export interface TableOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  // Serverda tayyor formatlangan sana — jadval qatorida shuni ko'rsatamiz
  // (mijoz tomonida qayta formatlash server/brauzer ICU farqidan
  // hydration xatosiga olib kelishi mumkin edi).
  createdAtLabel: string;
  clientName: string;
  type: OrderType;
  status: OrderStatus;
  priority: OrderPriority;
  total: number;
  paidAmount: number;
  currency: Currency;
}

const COLUMNS = [
  { key: "orderNumber", label: "Raqami" },
  { key: "createdAt", label: "Sana" },
  { key: "clientName", label: "Mijoz" },
  { key: "type", label: "Turi" },
  { key: "status", label: "Holat" },
  { key: "priority", label: "Ustuvorlik" },
  { key: "total", label: "Summa" },
  { key: "debt", label: "To'landi / Qarz" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const STORAGE_KEY = "oneshop:buyurtmalar:hiddenColumns";

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadCsv(orders: TableOrder[], visible: ColumnKey[]) {
  const cols = COLUMNS.filter((c) => visible.includes(c.key));
  const rows = orders.map((o) => {
    const debt = o.total - o.paidAmount;
    const values: Record<ColumnKey, string> = {
      orderNumber: o.orderNumber,
      createdAt: formatDate(o.createdAt),
      clientName: o.clientName,
      type: orderTypeLabel[o.type],
      status: orderStatusLabel[o.status],
      priority: orderPriorityLabel[o.priority],
      total: String(o.total),
      debt: o.status === "CANCELLED" ? "—" : String(debt),
    };
    return cols.map((c) => csvEscape(values[c.key])).join(",");
  });
  const csv = [cols.map((c) => csvEscape(c.label)).join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OrdersTable({
  orders,
  footer,
}: {
  orders: TableOrder[];
  footer?: React.ReactNode;
}) {
  const [hidden, setHidden] = useState<ColumnKey[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHidden(JSON.parse(raw));
    } catch {
      // localStorage ishlamasa — hammasi ko'rinadi, muammo emas
    }
  }, []);

  function toggle(key: ColumnKey) {
    setHidden((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const visibleCols = COLUMNS.filter((c) => !hidden.includes(c.key));

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-end gap-2 p-3 border-b border-border relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-gray-50"
        >
          <Columns3 size={16} /> Ustunlar
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-[132px] top-14 z-20 panel p-2 w-52">
              {COLUMNS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hidden.includes(c.key)}
                    onChange={() => toggle(c.key)}
                    className="accent-primary"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => downloadCsv(orders, visibleCols.map((c) => c.key))}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-gray-50"
        >
          <Download size={16} /> Yuklab olish
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Buyurtma yo'q"
          message="Birinchi buyurtmani yaratish uchun 'Yangi' tugmasini bosing"
          icon={<ShoppingCart size={22} />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                {visibleCols.map((c) => (
                  <th
                    key={c.key}
                    className={`px-5 py-3 ${
                      c.key === "total" || c.key === "debt" ? "text-right" : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const debt = o.total - o.paidAmount;
                const paidFully = debt <= 0;
                const cellFor = (key: ColumnKey) => {
                  switch (key) {
                    case "orderNumber":
                      return (
                        <Link
                          href={`/buyurtmalar/${o.id}`}
                          className="font-semibold text-primary"
                        >
                          {o.orderNumber}
                        </Link>
                      );
                    case "createdAt":
                      return <span className="text-ink-soft">{o.createdAtLabel}</span>;
                    case "clientName":
                      return o.clientName;
                    case "type":
                      return <span className="text-ink-soft">{orderTypeLabel[o.type]}</span>;
                    case "status":
                      return (
                        <span className={`chip ${orderStatusColor[o.status]}`}>
                          {orderStatusLabel[o.status]}
                        </span>
                      );
                    case "priority":
                      return o.priority !== "NORMAL" ? (
                        <span className={`chip ${orderPriorityColor[o.priority]}`}>
                          {orderPriorityLabel[o.priority]}
                        </span>
                      ) : null;
                    case "total":
                      return (
                        <span className="font-semibold whitespace-nowrap">
                          {formatMoney(o.total, o.currency)}
                        </span>
                      );
                    case "debt":
                      return o.status === "CANCELLED" ? (
                        <span className="text-ink-soft">—</span>
                      ) : paidFully ? (
                        <span className="text-success font-semibold whitespace-nowrap">
                          ✓ {formatMoney(o.paidAmount, o.currency)}
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-ink-soft whitespace-nowrap">
                            {formatMoney(o.paidAmount, o.currency)}
                          </span>
                          <span className="text-danger font-bold whitespace-nowrap">
                            −{formatMoney(debt, o.currency)}
                          </span>
                        </div>
                      );
                  }
                };
                return (
                  <ClickableRow
                    key={o.id}
                    href={`/buyurtmalar/${o.id}`}
                    className="border-b border-border/50 hover:bg-gray-50/50"
                  >
                    {visibleCols.map((c) => (
                      <td
                        key={c.key}
                        className={`px-5 py-3 ${
                          c.key === "total" || c.key === "debt" ? "text-right" : ""
                        }`}
                      >
                        {cellFor(c.key)}
                      </td>
                    ))}
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </div>
  );
}
