import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { getSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { orderTypeLabel, orderStatusLabel } from "@/lib/labels";
import { Plus, LayoutGrid, Table2 } from "lucide-react";
import type { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { RETAIL_FLOW, MANUFACTURING_FLOW } from "@/lib/state-machine";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import OrdersTable from "./orders-table";
import OrdersKanban from "./orders-kanban";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: OrderStatus[] = [
  "BUYURTMA_OLINDI",
  "YETKAZILMOQDA",
  "PROCESSING",
  "READY",
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    q?: string;
    from?: string;
    to?: string;
    type?: string;
    status?: string;
    pay?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter;
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const view = sp.view === "table" ? "table" : "kanban";
  const session = await getSession();

  // Joriy query'ni saqlab, faqat kerakli kalitlarni almashtiradigan href.
  // "page" — patch o'zi uni bermasa, filtr/ko'rinish o'zgarganda 1-sahifaga
  // qaytarish uchun avtomatik tozalanadi.
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      ...sp,
      page: undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/buyurtmalar?${qs}` : "/buyurtmalar";
  }

  // Mas'ul (otvetstvenniy) bo'yicha filter: SOTUVCHI faqat o'zi biriktirilgan
  // buyurtmalarni ko'radi.  Rahbar/Bosh admin — hammasini.
  // Kelajakda `seller.userId = session.id` bilan aniqlash mumkin.
  const isSotuvchi =
    session?.role === "SOTUVCHI" || session?.role === "SELLER";

  const where: Prisma.OrderWhereInput = {
    ...(filter === "active"
      ? { status: { in: ACTIVE_STATUSES } }
      : filter === "debt"
        ? { status: { not: "CANCELLED" as const } }
        : {}),
    ...(isSotuvchi
      ? {
          seller: {
            is: { employee: { is: { userId: session?.id ?? "__none__" } } },
          },
        }
      : {}),
    ...(sp.type ? { type: sp.type as OrderType } : {}),
    ...(sp.status ? { status: sp.status as OrderStatus } : {}),
    ...(sp.from || sp.to
      ? {
          createdAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { orderNumber: { contains: sp.q, mode: "insensitive" } },
            { clientNameSnapshot: { contains: sp.q, mode: "insensitive" } },
            { client: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  // Kanban ustunlarning hammasini to'liq ko'rsatishi kerak — sahifalash
  // qo'llanilmaydi, o'rniga kattaroq qopqoq bilan cheklaymiz. Jadval esa
  // haqiqiy sahifalash (raqamli) bilan ishlaydi.
  const skip = view === "table" ? (pageNum - 1) * pageSize : 0;
  const take = view === "table" ? pageSize : 500;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { client: { select: { name: true } } },
    }),
    view === "table" ? prisma.order.count({ where }) : Promise.resolve(0),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const list =
    filter === "debt"
      ? orders.filter((o) => (o.agreedAmount ?? 0) - o.paidAmount > 0)
      : sp.pay
        ? orders.filter((o) => {
            const debt = (o.agreedAmount ?? 0) - o.paidAmount;
            if (sp.pay === "full") return debt <= 0 && o.status !== "CANCELLED";
            if (sp.pay === "partial") return debt > 0 && o.paidAmount > 0;
            if (sp.pay === "unpaid") return o.paidAmount === 0 && o.status !== "CANCELLED";
            return true;
          })
        : orders;

  const countLabel = view === "table" ? totalCount : list.length;
  const subtitle =
    filter === "active"
      ? `Aktiv buyurtmalar (${countLabel})`
      : filter === "debt"
        ? `Qarzi bor buyurtmalar (${countLabel})`
        : `Barcha buyurtmalar (${countLabel})`;

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        subtitle={subtitle}
        actions={
          <Link
            href="/buyurtmalar/yangi"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
          >
            <Plus size={16} /> Yangi buyurtma
          </Link>
        }
      />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          <Link
            href={hrefWith({ view: "kanban" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              view === "kanban" ? "bg-white shadow-sm" : "text-ink-soft"
            }`}
          >
            <LayoutGrid size={15} /> Kanban
          </Link>
          <Link
            href={hrefWith({ view: "table" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              view === "table" ? "bg-white shadow-sm" : "text-ink-soft"
            }`}
          >
            <Table2 size={15} /> Jadval
          </Link>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          <Link
            href={hrefWith({ filter: undefined })}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              !filter ? "bg-white shadow-sm" : "text-ink-soft"
            }`}
          >
            Barchasi
          </Link>
          <Link
            href={hrefWith({ filter: "active" })}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              filter === "active" ? "bg-white shadow-sm" : "text-ink-soft"
            }`}
          >
            Aktiv
          </Link>
          <Link
            href={hrefWith({ filter: "debt" })}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              filter === "debt" ? "bg-white shadow-sm" : "text-ink-soft"
            }`}
          >
            Qarzli
          </Link>
        </div>
      </div>

      <ListToolbar
        popover
        searchPlaceholder="Raqami yoki mijoz bo'yicha qidirish..."
        selects={[
          {
            key: "type",
            label: "Turi",
            options: Object.entries(orderTypeLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: "Bosqich",
            options: Object.entries(orderStatusLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "pay",
            label: "To'lov holati",
            options: [
              { value: "full", label: "To'liq to'langan" },
              { value: "partial", label: "Qisman to'langan" },
              { value: "unpaid", label: "To'lanmagan" },
            ],
          },
        ]}
        dateRange={{ label: "Sana oralig'i" }}
      />

      {view === "kanban" ? (
        <OrdersKanban
          stages={
            sp.type === "MANUFACTURING"
              ? [...MANUFACTURING_FLOW, "CANCELLED"]
              : sp.type === "POS"
                ? (["YANGI_SOROV", "YAKUNLANDI", "CANCELLED"] as OrderStatus[])
                : [...RETAIL_FLOW, "CANCELLED"]
          }
          orders={list.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            type: o.type,
            status: o.status,
            clientName: o.client?.name ?? o.clientNameSnapshot ?? "—",
            total: o.agreedAmount ?? 0,
            currency: o.orderCurrency,
            createdAtLabel: formatDateTime(o.createdAt),
            updatedAt: o.updatedAt.toISOString(),
          }))}
        />
      ) : (
        <OrdersTable
          orders={list.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            createdAt: o.createdAt.toISOString(),
            createdAtLabel: formatDate(o.createdAt),
            clientName: o.client?.name ?? o.clientNameSnapshot ?? "—",
            type: o.type,
            status: o.status,
            priority: o.priority,
            total: o.agreedAmount ?? 0,
            paidAmount: o.paidAmount,
            currency: o.orderCurrency,
          }))}
          footer={
            <Pagination
              page={pageNum}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              buildHref={(p) => hrefWith({ page: String(p) })}
            />
          }
        />
      )}
    </div>
  );
}
