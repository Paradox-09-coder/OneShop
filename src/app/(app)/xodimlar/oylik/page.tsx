import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import SectionTabs from "@/components/section-tabs";
import { formatMoney } from "@/lib/utils";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import PaySalaryButton from "./pay-salary-button";
import type { Prisma } from "@prisma/client";

export default async function PayrollPage({
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
    return qs ? `/xodimlar/oylik?${qs}` : "/xodimlar/oylik";
  }

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

  const [visible, totalCount, employees, accounts] = await Promise.all([
    prisma.payrollAccrual.findMany({
      where,
      orderBy: [{ period: "desc" }],
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: { employee: { include: { counterparty: true } } },
    }),
    prisma.payrollAccrual.count({ where }),
    prisma.employee.findMany({
      include: { counterparty: { select: { name: true } } },
      orderBy: { counterparty: { name: "asc" } },
    }),
    prisma.account.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <PageHeader
        title="Oyliklar"
        subtitle="Xodimlar oylik hisoblari"
        actions={
          <PaySalaryButton
            employees={employees.map((e) => ({
              id: e.counterpartyId,
              name: e.counterparty.name,
            }))}
            accounts={accounts}
          />
        }
      />
      <SectionTabs
        tabs={[
          { label: "Xodimlar", href: "/xodimlar" },
          { label: "Oyliklar", href: "/xodimlar/oylik" },
        ]}
      />
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
