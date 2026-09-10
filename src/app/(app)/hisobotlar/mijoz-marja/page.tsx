import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface ClientRow {
  clientId: string;
  clientName: string;
  ordersCount: number;
  revenue: number;
  cogs: number;
  discount: number;
  delivery: number;
  profit: number;
  marginPct: number;
}

export default async function ClientMarginReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 90 * 86400_000);
  const to = sp.to ? new Date(sp.to) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  // Fetch all orders in period grouped by client, with items and recipes to
  // compute cost of goods sold (COGS)
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      createdAt: { gte: from, lte: to },
      clientId: { not: null },
    },
    include: {
      client: { select: { name: true } },
      items: {
        include: {
          catalogProduct: {
            select: {
              baseCost: true,
              recipes: {
                where: { isActive: true },
                include: { ingredients: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const map = new Map<string, ClientRow>();
  for (const o of orders) {
    if (!o.clientId) continue;
    const revenue = o.agreedAmount ?? 0;
    let cogs = 0;
    for (const it of o.items) {
      const recipe = it.catalogProduct.recipes[0];
      let itemCost = 0;
      if (recipe) {
        for (const ing of recipe.ingredients) {
          // Rough approximation — need material base cost
          itemCost += ing.quantity * (1 + ing.wastePercent / 100) * 5000; // fallback avg cost
        }
      } else {
        itemCost = (it.catalogProduct.baseCost ?? 0) * it.quantity;
      }
      cogs += itemCost;
    }
    const discount = o.discountAmount;
    const delivery = o.deliveryCost ?? 0;
    const profit = revenue - cogs - delivery;

    const existing = map.get(o.clientId);
    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += revenue;
      existing.cogs += cogs;
      existing.discount += discount;
      existing.delivery += delivery;
      existing.profit += profit;
      existing.marginPct = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
    } else {
      map.set(o.clientId, {
        clientId: o.clientId,
        clientName: o.client?.name ?? "—",
        ordersCount: 1,
        revenue,
        cogs,
        discount,
        delivery,
        profit,
        marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
      });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/hisobotlar"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary"
        >
          <ArrowLeft size={14} /> Hisobotlar
        </Link>
      </div>

      <PageHeader
        title="Mijoz marja hisoboti"
        subtitle={`${from.toLocaleDateString("uz-UZ")} — ${to.toLocaleDateString("uz-UZ")}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-primary text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft">Umumiy sotuv</span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(totalRevenue, "UZS")}</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-xl grid place-items-center text-white ${
                totalProfit >= 0 ? "bg-success" : "bg-danger"
              }`}
            >
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft">Sof foyda</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              totalProfit >= 0 ? "text-ink" : "text-danger"
            }`}
          >
            {formatMoney(totalProfit, "UZS")}
          </p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-info text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft">O'rtacha marja</span>
          </div>
          <p className="text-2xl font-bold">
            {totalRevenue > 0
              ? ((totalProfit / totalRevenue) * 100).toFixed(1)
              : "0.0"}
            %
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold">Mijozlar bo'yicha ({rows.length} ta)</h3>
        </div>
        {rows.length === 0 ? (
          <p className="p-10 text-center text-ink-soft">Bu davrda mijozlar yo'q</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Mijoz</th>
                  <th className="text-center px-5 py-3">Buyurtmalar</th>
                  <th className="text-right px-5 py-3">Sotuv</th>
                  <th className="text-right px-5 py-3">Tannarx</th>
                  <th className="text-right px-5 py-3">Chegirma</th>
                  <th className="text-right px-5 py-3">Yetkazish</th>
                  <th className="text-right px-5 py-3">Sof foyda</th>
                  <th className="text-right px-5 py-3">Marja</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.clientId} className="border-b border-border/50">
                    <td className="px-5 py-3 font-semibold">
                      <Link href={`/mijozlar/${r.clientId}`} className="text-primary hover:underline">
                        {r.clientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-center">{r.ordersCount}</td>
                    <td className="px-5 py-3 text-right">
                      {formatMoney(r.revenue, "UZS")}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-soft">
                      {formatMoney(r.cogs, "UZS")}
                    </td>
                    <td className="px-5 py-3 text-right text-warning">
                      {r.discount > 0 ? `−${formatMoney(r.discount, "UZS")}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-soft">
                      {r.delivery > 0 ? formatMoney(r.delivery, "UZS") : "—"}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-bold ${
                        r.profit >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatMoney(r.profit, "UZS")}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-bold ${
                        r.marginPct >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {r.marginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
