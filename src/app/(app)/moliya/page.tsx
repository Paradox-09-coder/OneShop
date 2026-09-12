import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import DateRangePicker from "./date-range-picker";
import { formatMoney } from "@/lib/utils";
import { accountTypeLabel, paymentTxLabel } from "@/lib/labels";
import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import TransferButton from "./transfer-button";

export const dynamic = "force-dynamic";

type Range = "today" | "week" | "month" | "year" | "custom";

function rangeToDates(range: Range, from?: string, to?: string): [Date, Date] {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === "custom" && from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end2 = to ? new Date(to) : now;
    end2.setHours(23, 59, 59, 999);
    return [start, end2];
  }

  let start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (range === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    // month (default)
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return [start, end];
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: Range; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range ?? "month";
  const [start, end] = rangeToDates(range, sp.from, sp.to);

  const [accounts, incomeAgg, expenseAgg, recentPayments] = await Promise.all([
    prisma.account.findMany({ where: { isActive: true } }),
    prisma.payment.aggregate({
      where: {
        type: { in: ["CASH_IN", "BANK_IN"] },
        voidedAt: null,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        type: { in: ["CASH_OUT", "BANK_OUT"] },
        voidedAt: null,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        account: { select: { name: true } },
        counterparty: { select: { name: true } },
      },
    }),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  const expense = expenseAgg._sum.amount ?? 0;
  const net = income - expense;

  const rangeLabel =
    range === "today"
      ? "Bugungi"
      : range === "week"
        ? "Haftalik"
        : range === "year"
          ? "Yillik"
          : range === "custom"
            ? "Tanlangan davr"
            : "Oylik";

  return (
    <div>
      <PageHeader
        title="Moliya"
        subtitle={`${rangeLabel} ko'rsatkichlar`}
        actions={
          <Link
            href="/moliya/tranzaksiyalar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
          >
            Barcha tranzaksiyalar
          </Link>
        }
      />

      <DateRangePicker current={range} from={sp.from} to={sp.to} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-success text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">
              {rangeLabel} kirim
            </span>
          </div>
          <p className="text-2xl font-bold">{formatMoney(income, "UZS")}</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-danger text-white">
              <TrendingDown size={18} />
            </div>
            <span className="text-sm text-ink-soft font-medium">
              {rangeLabel} chiqim
            </span>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Hisoblar</h3>
            {accounts.length >= 2 && (
              <TransferButton
                accounts={accounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  currency: a.currency,
                  balanceCache: a.balanceCache,
                }))}
              />
            )}
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">
              Hisoblar qo'shilmagan
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <Link
                  key={a.id}
                  href={`/moliya/hisoblar/${a.id}`}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-primary/5 hover:shadow-sm transition"
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
                </Link>
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
