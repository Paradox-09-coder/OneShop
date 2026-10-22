import Link from "next/link";
import AnimatedNumber from "@/components/animated-number";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/labels";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ordersByStatus, salesByEmployee, topProducts, income, expense] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
      _sum: { agreedAmount: true },
    }),
    prisma.order.groupBy({
      by: ["sellerEmployeeId"],
      where: {
        sellerEmployeeId: { not: null },
        status: { not: "CANCELLED" },
        createdAt: { gte: monthStart },
      },
      _count: true,
      _sum: { agreedAmount: true },
      orderBy: { _sum: { agreedAmount: "desc" } },
      take: 10,
    }),
    prisma.orderItem.groupBy({
      by: ["catalogProductId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.payment.aggregate({
      where: {
        type: { in: ["CASH_IN", "BANK_IN"] },
        voidedAt: null,
        date: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        type: { in: ["CASH_OUT", "BANK_OUT"] },
        voidedAt: null,
        date: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  const sellerIds = salesByEmployee
    .map((s) => s.sellerEmployeeId)
    .filter(Boolean) as string[];
  const productIds = topProducts.map((p) => p.catalogProductId);

  const [sellers, products] = await Promise.all([
    sellerIds.length
      ? prisma.counterparty.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.catalogProduct.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true },
        })
      : Promise.resolve([]),
  ]);

  const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s.name]));
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const netProfit = (income._sum.amount ?? 0) - (expense._sum.amount ?? 0);

  return (
    <div>
      <PageHeader
        title="Hisobotlar"
        subtitle="Oy bo'yicha ko'rsatkichlar"
        actions={
          <Link
            href="/hisobotlar/mijoz-marja"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark"
          >
            <Users size={16} /> Mijoz marja hisoboti
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <p className="text-sm text-ink-soft">Oylik daromad</p>
          <p className="text-2xl font-bold text-success mt-1">
            <AnimatedNumber value={income._sum.amount ?? 0} kind="money" />
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-ink-soft">Oylik xarajat</p>
          <p className="text-2xl font-bold text-danger mt-1">
            <AnimatedNumber value={expense._sum.amount ?? 0} kind="money" />
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-ink-soft">Sof foyda</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              netProfit >= 0 ? "text-primary" : "text-danger"
            }`}
          >
            <AnimatedNumber value={netProfit} kind="money" />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Buyurtmalar holati bo'yicha</h3>
          <div className="space-y-2">
            {ordersByStatus.map((s) => (
              <div
                key={s.status}
                className="flex justify-between p-2 rounded-lg bg-gray-50"
              >
                <span className="text-sm">{orderStatusLabel[s.status]}</span>
                <div className="text-right">
                  <span className="font-bold">{s._count}</span>
                  <span className="text-xs text-ink-soft ml-2">
                    ({formatMoney(s._sum.agreedAmount ?? 0, "UZS")})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="font-bold mb-3">TOP sotuvchilar (oy)</h3>
          <div className="space-y-2">
            {salesByEmployee.map((s, i) => (
              <div
                key={s.sellerEmployeeId}
                className="flex justify-between p-2 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold grid place-items-center">
                    {i + 1}
                  </span>
                  <span className="text-sm">
                    {sellerMap[s.sellerEmployeeId ?? ""] ?? "—"}
                  </span>
                </div>
                <span className="font-bold">
                  {formatMoney(s._sum.agreedAmount ?? 0, "UZS")}
                </span>
              </div>
            ))}
            {salesByEmployee.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">
                Ma'lumot yo'q
              </p>
            )}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-2">
          <h3 className="font-bold mb-3">TOP mahsulotlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {topProducts.map((p, i) => (
              <div
                key={p.catalogProductId}
                className="flex justify-between p-3 rounded-xl bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold grid place-items-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">
                      {productMap[p.catalogProductId]?.name ?? "—"}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {productMap[p.catalogProductId]?.sku ?? ""}
                    </p>
                  </div>
                </div>
                <span className="font-bold">{p._sum.quantity ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
