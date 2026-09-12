import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { paymentTxLabel, paymentSourceLabel } from "@/lib/labels";
import { CreditCard } from "lucide-react";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import type { PaymentTxType, Prisma } from "@prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/moliya/tranzaksiyalar?${qs}` : "/moliya/tranzaksiyalar";
  }

  const where: Prisma.PaymentWhereInput = {
    ...(sp.type ? { type: sp.type as PaymentTxType } : {}),
    ...(sp.from || sp.to
      ? {
          date: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { counterpartyNameSnapshot: { contains: sp.q, mode: "insensitive" } },
            { counterparty: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
            { category: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
            { description: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [visible, totalCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        account: { select: { name: true } },
        counterparty: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <PageHeader
        title="Tranzaksiyalar"
        subtitle="Barcha pul harakatlari"
      />
      <ListToolbar
        searchPlaceholder="Kim/nima, kategoriya bo'yicha qidirish..."
        selects={[
          {
            key: "type",
            label: "Turi",
            options: Object.entries(paymentTxLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
        dateRange={{ label: "Sana" }}
      />
      <div className="panel overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            title="Tranzaksiyalar yo'q"
            icon={<CreditCard size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-4 py-2">Sana</th>
                  <th className="text-left px-4 py-2">Turi</th>
                  <th className="text-left px-4 py-2">Hisob</th>
                  <th className="text-left px-4 py-2">Kim/Nima</th>
                  <th className="text-left px-4 py-2">Kategoriya</th>
                  <th className="text-left px-4 py-2">Manba</th>
                  <th className="text-right px-4 py-2">Summa</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const isIn = ["CASH_IN", "BANK_IN"].includes(p.type);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border/50 ${
                        p.voidedAt ? "opacity-40 line-through" : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-ink-soft">
                        {formatDateTime(p.date)}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {paymentTxLabel[p.type]}
                      </td>
                      <td className="px-4 py-2">{p.account?.name ?? "—"}</td>
                      <td className="px-4 py-2">
                        {p.counterparty?.name ?? p.counterpartyNameSnapshot ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-ink-soft">
                        {p.category?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-ink-soft">
                        {paymentSourceLabel[p.sourceType]}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold whitespace-nowrap ${
                          isIn ? "text-success" : "text-danger"
                        }`}
                      >
                        {isIn ? "+" : "−"}
                        {formatMoney(p.amount, p.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          buildHref={(p) => hrefWith({ page: String(p) })}
        />
      </div>
    </div>
  );
}
