import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { accountTypeLabel, paymentTxLabel, paymentSourceLabel } from "@/lib/labels";
import { CreditCard, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) notFound();

  const [payments, incomeAgg, expenseAgg] = await Promise.all([
    prisma.payment.findMany({
      where: { accountId: id },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        counterparty: { select: { name: true } },
        category: { select: { name: true } },
        order: { select: { orderNumber: true, id: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { accountId: id, type: { in: ["CASH_IN", "BANK_IN"] }, voidedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { accountId: id, type: { in: ["CASH_OUT", "BANK_OUT"] }, voidedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  const expense = expenseAgg._sum.amount ?? 0;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/moliya/hisoblar"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary"
        >
          <ArrowLeft size={14} /> Hisoblar
        </Link>
      </div>

      <PageHeader
        title={account.name}
        subtitle={`${accountTypeLabel[account.type]} • ${account.currency}`}
        actions={
          <span className="chip bg-primary/10 text-primary text-base font-bold py-1.5 px-4">
            {formatMoney(account.balanceCache, account.currency)}
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-success text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Umumiy kirim</span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(income, account.currency)}</p>
          <p className="text-xs text-ink-soft mt-1">{incomeAgg._count} ta tranzaksiya</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-danger text-white">
              <TrendingDown size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Umumiy chiqim</span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(expense, account.currency)}</p>
          <p className="text-xs text-ink-soft mt-1">{expenseAgg._count} ta tranzaksiya</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-primary text-white">
              <CreditCard size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Sof balans</span>
          </div>
          <p className={`text-2xl font-bold ${income - expense >= 0 ? "text-ink" : "text-danger"}`}>
            {formatMoney(income - expense, account.currency)}
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold">Tranzaksiyalar tarixi</h3>
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Tranzaksiyalar yo'q"
            message="Bu hisobda hozircha kirim yoki chiqim qilinmagan"
            icon={<CreditCard size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-left px-5 py-3">Turi</th>
                  <th className="text-left px-5 py-3">Kim/Nima</th>
                  <th className="text-left px-5 py-3">Kategoriya</th>
                  <th className="text-left px-5 py-3">Manba</th>
                  <th className="text-right px-5 py-3">Summa</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isIn = ["CASH_IN", "BANK_IN"].includes(p.type);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border/50 hover:bg-gray-50/50 ${
                        p.voidedAt ? "opacity-40 line-through" : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-ink-soft">
                        {formatDateTime(p.date)}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {paymentTxLabel[p.type]}
                      </td>
                      <td className="px-5 py-3">
                        {p.counterparty?.name ?? p.counterpartyNameSnapshot ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {p.category?.name ?? p.description ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {p.order ? (
                          <Link
                            href={`/buyurtmalar/${p.order.id}`}
                            className="text-primary font-semibold"
                          >
                            {p.order.orderNumber}
                          </Link>
                        ) : (
                          paymentSourceLabel[p.sourceType]
                        )}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold ${
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
      </div>
    </div>
  );
}
