import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import {
  orderStatusLabel,
  orderStatusColor,
  orderTypeLabel,
  orderPriorityLabel,
} from "@/lib/labels";
import { Plus, ShoppingCart } from "lucide-react";
import type { OrderStatus, OrderType, Prisma } from "@prisma/client";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import ClickableRow from "@/components/clickable-row";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: OrderStatus[] = [
  "MASLAHAT_BERILDI",
  "NARX_KELISHILDI",
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
    take?: string;
  }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter;
  const take = Number(sp.take) || 30;
  const session = await getSession();

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

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    include: { client: { select: { name: true } } },
  });
  const hasMore = orders.length > take;
  const page = orders.slice(0, take);

  const list = filter === "debt"
    ? page.filter((o) => (o.agreedAmount ?? 0) - o.paidAmount > 0)
    : page;

  const subtitle =
    filter === "active"
      ? `Aktiv buyurtmalar (${list.length})`
      : filter === "debt"
        ? `Qarzi bor buyurtmalar (${list.length})`
        : `Barcha buyurtmalar (${list.length})`;

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        subtitle={subtitle}
        actions={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
              <Link
                href="/buyurtmalar"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  !filter ? "bg-white shadow-sm" : "text-ink-soft"
                }`}
              >
                Barchasi
              </Link>
              <Link
                href="/buyurtmalar?filter=active"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  filter === "active" ? "bg-white shadow-sm" : "text-ink-soft"
                }`}
              >
                Aktiv
              </Link>
              <Link
                href="/buyurtmalar?filter=debt"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  filter === "debt" ? "bg-white shadow-sm" : "text-ink-soft"
                }`}
              >
                Qarzli
              </Link>
            </div>
            <Link
              href="/buyurtmalar/yangi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
            >
              <Plus size={16} /> Yangi
            </Link>
          </div>
        }
      />

      <ListToolbar
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
            label: "Holat",
            options: Object.entries(orderStatusLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
        dateRange={{ label: "Sana" }}
      />

      <div className="panel overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            title="Buyurtma yo'q"
            message={
              filter === "active"
                ? "Aktiv holatdagi buyurtmalar hozircha yo'q"
                : filter === "debt"
                  ? "Qarzi bor buyurtmalar yo'q"
                  : "Birinchi buyurtmani yaratish uchun 'Yangi' tugmasini bosing"
            }
            icon={<ShoppingCart size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Raqami</th>
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-left px-5 py-3">Mijoz</th>
                  <th className="text-left px-5 py-3">Turi</th>
                  <th className="text-left px-5 py-3">Holat</th>
                  <th className="text-left px-5 py-3">Ustuvorlik</th>
                  <th className="text-right px-5 py-3">Summa</th>
                  <th className="text-right px-5 py-3">To'landi / Qarz</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => {
                  const total = o.agreedAmount ?? 0;
                  const debt = total - o.paidAmount;
                  const paidFully = debt <= 0;
                  return (
                    <ClickableRow
                      key={o.id}
                      href={`/buyurtmalar/${o.id}`}
                      className="border-b border-border/50 hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/buyurtmalar/${o.id}`}
                          className="font-semibold text-primary"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {o.client?.name ?? o.clientNameSnapshot ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {orderTypeLabel[o.type]}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`chip ${orderStatusColor[o.status]}`}>
                          {orderStatusLabel[o.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {o.priority !== "NORMAL" && (
                          <span
                            className={
                              o.priority === "VIP"
                                ? "chip bg-fuchsia-100 text-fuchsia-700"
                                : "chip bg-amber-100 text-amber-700"
                            }
                          >
                            {orderPriorityLabel[o.priority]}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                        {formatMoney(total, o.orderCurrency)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {o.status === "CANCELLED" ? (
                          <span className="text-ink-soft">—</span>
                        ) : paidFully ? (
                          <span className="text-success font-semibold">
                            ✓ {formatMoney(o.paidAmount, o.orderCurrency)}
                          </span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-ink-soft">
                              {formatMoney(o.paidAmount, o.orderCurrency)}
                            </span>
                            <span className="text-danger font-bold">
                              −{formatMoney(debt, o.orderCurrency)}
                            </span>
                          </div>
                        )}
                      </td>
                    </ClickableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <LoadMore hasMore={hasMore} />
      </div>
    </div>
  );
}
