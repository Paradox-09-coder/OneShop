import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { accountTypeLabel, paymentTxLabel } from "@/lib/labels";
import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";

export default async function FinancePage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [accounts, incomeMonth, expenseMonth, recentPayments] = await Promise.all([
    prisma.account.findMany({ where: { isActive: true } }),
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
    prisma.payment.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: {
        account: { select: { name: true } },
        counterparty: { select: { name: true } },
      },
    }),
  ]);

  const income = incomeMonth._sum.amount ?? 0;
  const expense = expenseMonth._sum.amount ?? 0;
  const net = income - expense;

  return (
    <div>
      <PageHeader
        title="Moliya"
        subtitle="Hisoblar, tranzaksiyalar va qarzdorliklar"
        actions={
          <Link
            href="/moliya/tranzaksiyalar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
          >
            Barcha tranzaksiyalar
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-success text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Oylik kirim</span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(income, "UZS")}</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-danger text-white">
              <TrendingDown size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Oylik chiqim</span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(expense, "UZS")}</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl grid place-items-center text-white ${
                net >= 0 ? "bg-primary" : "bg-warning"
              }`}
            >
              <Wallet size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">Sof foyda</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              net >= 0 ? "text-ink" : "text-danger"
            }`}
          >
            {formatMoney(net, "UZS")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Hisoblar</h3>
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">
              Hisoblar qo'shilmagan
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-sm">{a.name}</p>
                    <p className="text-xs text-ink-soft">
                      {accountTypeLabel[a.type]}
                    </p>
                  </div>
                  <p className="font-bold">
                    {formatMoney(a.balanceCache, a.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> So'nggi tranzaksiyalar
          </h3>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">
              Tranzaksiyalar yo'q
            </p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {paymentTxLabel[p.type]}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {p.counterparty?.name ?? p.counterpartyNameSnapshot ?? "—"}
                    </p>
                  </div>
                  <p
                    className={`font-bold text-sm ${
                      ["CASH_IN", "BANK_IN"].includes(p.type)
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {["CASH_IN", "BANK_IN"].includes(p.type) ? "+" : "−"}
                    {formatMoney(p.amount, p.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
