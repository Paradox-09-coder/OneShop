"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { DragEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  MessageCircle,
  Tag,
  ShoppingCart,
  Truck,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader,
  PackageCheck,
  CheckCheck,
  XCircle,
} from "lucide-react";
import type { OrderStatus, OrderType, Currency } from "@prisma/client";
import { orderStatusLabel } from "@/lib/labels";
import { canTransition } from "@/lib/state-machine";
import { formatMoney } from "@/lib/utils";
import { useDialog } from "@/components/use-dialog";

// Referens dizayn (isell)dagi kabi — har bir bosqich to'liq rangli sarlavha
// panelida, o'ziga xos ikonka bilan.
const STAGE_STYLE: Record<OrderStatus, { bg: string; icon: LucideIcon }> = {
  YANGI_SOROV: { bg: "bg-slate-500", icon: ClipboardList },
  MASLAHAT_BERILDI: { bg: "bg-sky-500", icon: MessageCircle },
  NARX_KELISHILDI: { bg: "bg-indigo-500", icon: Tag },
  BUYURTMA_OLINDI: { bg: "bg-amber-500", icon: ShoppingCart },
  YETKAZILMOQDA: { bg: "bg-blue-500", icon: Truck },
  YAKUNLANDI: { bg: "bg-emerald-500", icon: CheckCircle2 },
  PROPOSAL: { bg: "bg-slate-500", icon: FileText },
  NEW: { bg: "bg-sky-500", icon: Sparkles },
  PROCESSING: { bg: "bg-amber-500", icon: Loader },
  READY: { bg: "bg-indigo-500", icon: PackageCheck },
  DELIVERED: { bg: "bg-emerald-500", icon: CheckCheck },
  CANCELLED: { bg: "bg-rose-500", icon: XCircle },
};

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
  // Bosqich bo'yicha saralash uchun — eng oxirgi o'zgargan (ko'chirilgan)
  // buyurtma ustunning tepasida chiqishi kerak.
  updatedAt: string;
}

// Buyurtmalarni bosqich (status) bo'yicha ustunlarga ajratib, qo'lda
// ushlab boshqa ustunga tashlash orqali holatini o'zgartiradigan kanban.
// Ruxsat etilmagan o'tish (state-machine.ts) bo'lsa — serverga so'rov
// yuborilmasdan, darhol xato ko'rsatiladi.
export default function OrdersKanban({
  orders,
  stages,
}: {
  orders: KanbanOrder[];
  // Aralash pipeline (chakana/ulgurji vs ishlab chiqarish)larni bitta
  // kanban'da 12 ta ustunga cho'zib yubormaslik uchun — server "Turi"
  // filteriga qarab tegishli bosqichlar ro'yxatini hisoblab beradi.
  stages: OrderStatus[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(orders);
  // Qidiruv/filtr o'zgarib, server yangi `orders` prop yuborsa — mahalliy
  // holatni shu bilan sinxronlaymiz (aks holda eski ro'yxat qolib ketardi).
  useEffect(() => setItems(orders), [orders]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);
  const [, startTransition] = useTransition();
  const { alert, confirm, Dialog } = useDialog();

  // Kartani chetga olib borganda ustunlar qatori o'zi surilib turishi —
  // Bitrix24'dagi kabi, ko'rinmayotgan ustunga (masalan "Bekor qilindi")
  // qo'lda scroll qilmasdan yetib borish uchun.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollDirRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const AUTO_SCROLL_EDGE = 90;
  const AUTO_SCROLL_SPEED = 14;

  function stopAutoScroll() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    scrollDirRef.current = 0;
  }

  function startAutoScroll() {
    if (rafRef.current != null) return;
    const step = () => {
      const el = scrollRef.current;
      if (el && scrollDirRef.current !== 0) {
        el.scrollLeft += scrollDirRef.current;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function handleContainerDragOver(e: DragEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX;
    if (x - rect.left < AUTO_SCROLL_EDGE) {
      scrollDirRef.current = -AUTO_SCROLL_SPEED;
      startAutoScroll();
    } else if (rect.right - x < AUTO_SCROLL_EDGE) {
      scrollDirRef.current = AUTO_SCROLL_SPEED;
      startAutoScroll();
    } else {
      scrollDirRef.current = 0;
    }
  }

  // Qayerda tugashidan qat'i nazar (bekor qilinsa, ruxsatsiz joyga
  // tashlansa ham) — surilish albatta to'xtasin.
  useEffect(() => {
    window.addEventListener("dragend", stopAutoScroll);
    return () => {
      window.removeEventListener("dragend", stopAutoScroll);
      stopAutoScroll();
    };
  }, []);

  const columns = stages.map((status) => ({
    status,
    // Eng oxirgi o'zgargan (masalan hozir shu bosqichga ko'chirilgan)
    // buyurtma birinchi bo'lib chiqadi.
    orders: items
      .filter((o) => o.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  }));

  async function handleDrop(targetStatus: OrderStatus) {
    stopAutoScroll();
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

    const ok = await confirm(
      `"${order.orderNumber}" buyurtmasini "${orderStatusLabel[targetStatus]}" bosqichiga o'tkazmoqchimisiz?`,
      { danger: targetStatus === "CANCELLED" }
    );
    if (!ok) return;

    const prevStatus = order.status;
    const prevUpdatedAt = order.updatedAt;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: targetStatus, updatedAt: now } : o))
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
        prev.map((o) =>
          o.id === id ? { ...o, status: prevStatus, updatedAt: prevUpdatedAt } : o
        )
      );
      alert(e instanceof Error ? e.message : "Holatni o'zgartirib bo'lmadi");
    }
  }

  return (
    <div
      ref={scrollRef}
      onDragOver={handleContainerDragOver}
      className="overflow-x-auto pb-4"
    >
      {Dialog}
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => {
          const columnTotal = col.orders.reduce((s, o) => s + o.total, 0);
          const style = STAGE_STYLE[col.status];
          const StageIcon = style.icon;
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
              className={`w-80 flex-shrink-0 rounded-2xl bg-white border border-border overflow-hidden transition-shadow ${
                dragOverStatus === col.status ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className={`${style.bg} px-4 py-3 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <StageIcon size={15} />
                    <span className="font-bold text-xs uppercase tracking-wide truncate">
                      {orderStatusLabel[col.status]}
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white/25 rounded-full px-2 py-0.5 shrink-0">
                    {col.orders.length}
                  </span>
                </div>
                <p className="text-sm font-semibold mt-1 text-white/90">
                  {formatMoney(columnTotal, "UZS")}
                </p>
              </div>
              <div className="space-y-3 p-3 bg-gray-50/50 max-h-[65vh] overflow-y-auto">
                {col.orders.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => setDraggingId(o.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => router.push(`/buyurtmalar/${o.id}`)}
                    className={`p-3 rounded-xl bg-white shadow-sm hover:shadow-md border border-border hover:border-primary/40 cursor-grab active:cursor-grabbing transition ${
                      draggingId === o.id ? "opacity-40" : ""
                    }`}
                  >
                    <span className="text-xs font-semibold text-primary">
                      {o.orderNumber}
                    </span>
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
