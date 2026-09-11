import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { paymentTxLabel, paymentSourceLabel } from "@/lib/labels";
import { CreditCard } from "lucide-react";

export default async function TransactionsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      account: { select: { name: true } },
      counterparty: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Tranzaksiyalar"
        subtitle="Barcha pul harakatlari"
      />
      <div className="panel overflow-hidden">
        {payments.length === 0 ? (
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
                {payments.map((p) => {
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
      </div>
    </div>
  );
}
