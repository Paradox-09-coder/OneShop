import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import type { Prisma } from "@prisma/client";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; take?: string }>;
}) {
  const sp = await searchParams;
  const take = Number(sp.take) || 30;

  const where: Prisma.PayrollAccrualWhereInput = {
    ...(sp.q
      ? {
          employee: {
            is: {
              counterparty: {
                is: { name: { contains: sp.q, mode: "insensitive" } },
              },
            },
          },
        }
      : {}),
  };

  const accruals = await prisma.payrollAccrual.findMany({
    where,
    orderBy: [{ period: "desc" }],
    take: take + 1,
    include: { employee: { include: { counterparty: true } } },
  });
  const hasMore = accruals.length > take;
  const visible = accruals.slice(0, take);

  return (
    <div>
      <PageHeader title="Oyliklar" subtitle="Xodimlar oylik hisoblari" />
      <ListToolbar searchPlaceholder="Xodim ismi bo'yicha qidirish..." />
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
            {visible.map((a) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">{a.period}</td>
                <td className="px-5 py-3">{a.employee.counterparty.name}</td>
                <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                  {formatMoney(a.amount, a.currency)}
                </td>
                <td className="px-5 py-3 text-ink-soft">{a.note ?? "—"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Oylik hisoblari yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <LoadMore hasMore={hasMore} />
      </div>
    </div>
  );
}
