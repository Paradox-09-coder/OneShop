import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import { orderStatusLabel, orderStatusColor } from "@/lib/labels";
import {
  ShoppingCart,
  Package,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  color?: string;
}

function StatCard({ icon, label, value, hint, color = "primary" }: StatCardProps) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl grid place-items-center text-white bg-${color}`}
        >
          {icon}
        </div>
        <span className="text-sm text-ink-soft font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    ordersThisMonth,
    ordersActive,
    unpaidTotal,
    lowStockCount,
    recentOrders,
    topClients,
    cashboxByCurrency,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: monthStart },
        status: { not: "CANCELLED" },
      },
      _sum: { agreedAmount: true },
      _count: true,
    }),
    prisma.order.count({
      where: {
        status: {
          in: [
            "MASLAHAT_BERILDI",
            "NARX_KELISHILDI",
            "BUYURTMA_OLINDI",
            "YETKAZILMOQDA",
            "PROCESSING",
            "READY",
          ],
        },
      },
    }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { agreedAmount: true, paidAmount: true },
    }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "catalogProductId")::bigint AS n
      FROM "InventoryLot"
      WHERE "qty" <= "lowStockThreshold" AND "lowStockThreshold" > 0
    `.then((r) => Number(r[0]?.n ?? 0)).catch(() => 0),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.order.groupBy({
      by: ["clientId"],
      where: { status: { not: "CANCELLED" }, clientId: { not: null } },
      _sum: { agreedAmount: true },
      orderBy: { _sum: { agreedAmount: "desc" } },
      take: 5,
    }),
    prisma.account.findMany({ where: { isActive: true } }),
  ]);

  const monthTotal = ordersThisMonth._sum.agreedAmount ?? 0;
  const debt =
    (unpaidTotal._sum.agreedAmount ?? 0) - (unpaidTotal._sum.paidAmount ?? 0);

  const topClientIds = topClients.map((t) => t.clientId).filter(Boolean) as string[];
  const topClientData = topClientIds.length
    ? await prisma.counterparty.findMany({
        where: { id: { in: topClientIds } },
        select: { id: true, name: true },
      })
    : [];
  const clientNameMap = Object.fromEntries(topClientData.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Bosh sahifa"
        subtitle={`Bugun: ${formatDate(new Date())}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="Oylik savdo"
          value={formatMoney(monthTotal, "UZS")}
          hint={`${ordersThisMonth._count} ta buyurtma`}
          color="primary"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Aktiv buyurtmalar"
          value={String(ordersActive)}
          hint="Jarayonda"
          color="info"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Debitor qarz"
          value={formatMoney(debt, "UZS")}
          hint="Mijozlardan olinishi kerak"
          color="warning"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Kam qoldiq"
          value={String(lowStockCount)}
          hint="Mahsulot ombordan tugab qolyapti"
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" />
              So'nggi buyurtmalar
            </h2>
            <Link href="/buyurtmalar" className="text-sm text-primary font-semibold">
              Barchasi →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border">
                  <th className="text-left px-5 py-2">Raqami</th>
                  <th className="text-left px-5 py-2">Mijoz</th>
                  <th className="text-left px-5 py-2">Holat</th>
                  <th className="text-right px-5 py-2">Summa</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/50 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/buyurtmalar/${o.id}`}
                        className="font-semibold text-primary"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">
                      {o.client?.name ?? o.clientNameSnapshot ?? "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`chip ${orderStatusColor[o.status]}`}
                      >
                        {orderStatusLabel[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold">
                      {formatMoney(o.agreedAmount ?? 0, o.orderCurrency)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                      Hozircha buyurtmalar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              Hisoblar
            </h2>
          </div>
          <div className="space-y-2">
            {cashboxByCurrency.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-ink-soft">{a.type}</p>
                </div>
                <p className="font-bold text-ink">
                  {formatMoney(a.balanceCache, a.currency)}
                </p>
              </div>
            ))}
            {cashboxByCurrency.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">
                Hisoblar qo'shilmagan
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Users size={18} className="text-primary" />
              TOP mijozlar
            </h2>
            <Link href="/mijozlar" className="text-sm text-primary font-semibold">
              Barchasi →
            </Link>
          </div>
          <div className="space-y-2">
            {topClients.map((c, i) => (
              <div
                key={c.clientId}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold grid place-items-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">
                    {clientNameMap[c.clientId ?? ""] ?? "—"}
                  </span>
                </div>
                <span className="font-bold">
                  {formatMoney(c._sum.agreedAmount ?? 0, "UZS")}
                </span>
              </div>
            ))}
            {topClients.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">
                Ma'lumot yo'q
              </p>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Ombor holati
            </h2>
            <Link href="/omborxona" className="text-sm text-primary font-semibold">
              Ombor →
            </Link>
          </div>
          <p className="text-sm text-ink-soft">
            Kam qoldiqli mahsulotlar: <b>{lowStockCount}</b>
          </p>
          <p className="text-sm text-ink-soft mt-1">
            Ombordagi harakatlar oxirgi 30 kun ichida ko'rib chiqiladi.
          </p>
        </div>
      </div>
    </div>
  );
}
