import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import type { Prisma } from "@prisma/client";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; take?: string }>;
}) {
  const sp = await searchParams;
  const take = Number(sp.take) || 30;

  const where: Prisma.EmployeeWhereInput = {
    ...(sp.q
      ? {
          OR: [
            { position: { contains: sp.q, mode: "insensitive" } },
            {
              counterparty: {
                is: {
                  OR: [
                    { name: { contains: sp.q, mode: "insensitive" } },
                    { phone: { contains: sp.q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const employees = await prisma.employee.findMany({
    where,
    include: {
      counterparty: true,
      _count: { select: { attendance: true } },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });
  const hasMore = employees.length > take;
  const visible = employees.slice(0, take);

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle={`${visible.length}${hasMore ? "+" : ""} ta xodim`}
      />
      <ListToolbar searchPlaceholder="Ism, lavozim yoki telefon bo'yicha qidirish..." />

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Ismi</th>
              <th className="text-left px-5 py-3">Lavozimi</th>
              <th className="text-left px-5 py-3">Telefon</th>
              <th className="text-right px-5 py-3">Oylik</th>
              <th className="text-center px-5 py-3">Turi</th>
              <th className="text-left px-5 py-3">Boshlagan</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.counterpartyId} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">
                  {e.counterparty.name}
                </td>
                <td className="px-5 py-3 text-ink-soft">{e.position ?? "—"}</td>
                <td className="px-5 py-3 text-ink-soft">
                  {e.counterparty.phone ?? "—"}
                </td>
                <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                  {formatMoney(e.baseSalary, e.salaryCurrency)}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="chip bg-slate-100 text-slate-700">
                    {e.salaryType === "FIXED"
                      ? "Belgilangan"
                      : e.salaryType === "KPI"
                        ? `KPI ${e.kpiPercentage}%`
                        : "Aralash"}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  {e.startDate ? formatDate(e.startDate) : "—"}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-soft">
                  Xodimlar yo'q. Kontragentlar sahifasidan xodim qo'shing.
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
