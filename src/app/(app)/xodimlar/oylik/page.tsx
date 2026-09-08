import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";

export default async function PayrollPage() {
  const accruals = await prisma.payrollAccrual.findMany({
    orderBy: [{ period: "desc" }],
    take: 100,
    include: { employee: { include: { counterparty: true } } },
  });

  return (
    <div>
      <PageHeader title="Oyliklar" subtitle="Xodimlar oylik hisoblari" />
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Oy</th>
              <th className="text-left px-5 py-3">Xodim</th>
              <th className="text-right px-5 py-3">Summa</th>
              <th className="text-left px-5 py-3">Izoh</th>
            </tr>
          </thead>
          <tbody>
            {accruals.map((a) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">{a.period}</td>
                <td className="px-5 py-3">{a.employee.counterparty.name}</td>
                <td className="px-5 py-3 text-right font-semibold">
                  {formatMoney(a.amount, a.currency)}
                </td>
                <td className="px-5 py-3 text-ink-soft">{a.note ?? "—"}</td>
              </tr>
            ))}
            {accruals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Oylik hisoblari yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
