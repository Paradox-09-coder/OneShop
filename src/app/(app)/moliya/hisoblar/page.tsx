import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { accountTypeLabel } from "@/lib/labels";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const totalByCurrency = new Map<string, number>();
  for (const a of accounts) {
    if (!a.isActive) continue;
    totalByCurrency.set(
      a.currency,
      (totalByCurrency.get(a.currency) ?? 0) + a.balanceCache
    );
  }

  return (
    <div>
      <PageHeader title="Hisoblar" subtitle="Kassa va bank hisoblari" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array.from(totalByCurrency.entries()).map(([c, sum]) => (
          <div key={c} className="panel p-5">
            <p className="text-sm text-ink-soft">Umumiy ({c})</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(sum, c)}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Nomi</th>
              <th className="text-left px-5 py-3">Turi</th>
              <th className="text-left px-5 py-3">Valyuta</th>
              <th className="text-right px-5 py-3">Balans</th>
              <th className="text-center px-5 py-3">Holat</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">{a.name}</td>
                <td className="px-5 py-3">{accountTypeLabel[a.type]}</td>
                <td className="px-5 py-3">{a.currency}</td>
                <td className="px-5 py-3 text-right font-bold">
                  {formatMoney(a.balanceCache, a.currency)}
                </td>
                <td className="px-5 py-3 text-center">
                  {a.isActive ? (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      Faol
                    </span>
                  ) : (
                    <span className="chip bg-gray-100 text-gray-700">Yopiq</span>
                  )}
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                  Hisoblar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
