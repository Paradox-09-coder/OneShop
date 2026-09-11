import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";

export default async function DebtsPage() {
  const parties = await prisma.counterparty.findMany({
    where: {
      deletedAt: null,
      balanceValue: { not: 0 },
    },
    orderBy: { balanceValue: "asc" },
    take: 100,
  });

  const debtors = parties.filter((p) => p.balanceValue < 0);
  const creditors = parties.filter((p) => p.balanceValue > 0);

  const totalDebt = debtors.reduce((s, p) => s + Math.abs(p.balanceValue), 0);
  const totalCredit = creditors.reduce((s, p) => s + p.balanceValue, 0);

  return (
    <div>
      <PageHeader
        title="Qarzdorliklar"
        subtitle="Kim qancha qarzdor, kimga qancha qarzimiz bor"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="panel p-5 border-l-4 border-l-danger">
          <p className="text-sm text-ink-soft">Bizga qarzdorlar (debitor)</p>
          <p className="text-2xl font-bold mt-1 text-danger">
            {formatMoney(totalDebt, "UZS")}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            {debtors.length} ta kontragent
          </p>
        </div>
        <div className="panel p-5 border-l-4 border-l-warning">
          <p className="text-sm text-ink-soft">Biz qarzdormiz (kreditor)</p>
          <p className="text-2xl font-bold mt-1 text-warning">
            {formatMoney(totalCredit, "UZS")}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            {creditors.length} ta kontragent
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Debitorlar</h3>
          <div className="space-y-2">
            {debtors.slice(0, 20).map((p) => (
              <div
                key={p.id}
                className="flex justify-between p-3 rounded-xl bg-gray-50"
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="font-bold text-danger whitespace-nowrap">
                  {formatMoney(Math.abs(p.balanceValue), p.balanceCurrency)}
                </span>
              </div>
            ))}
            {debtors.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">Yo'q</p>
            )}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Kreditorlar</h3>
          <div className="space-y-2">
            {creditors.slice(0, 20).map((p) => (
              <div
                key={p.id}
                className="flex justify-between p-3 rounded-xl bg-gray-50"
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="font-bold text-warning whitespace-nowrap">
                  {formatMoney(p.balanceValue, p.balanceCurrency)}
                </span>
              </div>
            ))}
            {creditors.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">Yo'q</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
