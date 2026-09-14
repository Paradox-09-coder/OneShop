import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import AddCounterpartyButton from "../kontragentlar/add-counterparty-button";
import type { Prisma } from "@prisma/client";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/xodimlar?${qs}` : "/xodimlar";
  }

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

  const [visible, totalCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        counterparty: true,
        _count: { select: { attendance: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle={`${totalCount} ta xodim`}
        actions={
          <AddCounterpartyButton
            defaultType="EMPLOYEE"
            lockType
            label="Xodim qo'shish"
            title="Yangi xodim"
          />
        }
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
                  Xodimlar yo'q. Yuqoridagi "Xodim qo'shish" tugmasini bosing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
