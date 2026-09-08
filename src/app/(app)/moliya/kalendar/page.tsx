import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import { scheduleItemStatusLabel } from "@/lib/labels";

export default async function FinanceCalendarPage() {
  const items = await prisma.paymentScheduleItem.findMany({
    where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    orderBy: { dueDate: "asc" },
    take: 100,
    include: {
      schedule: {
        include: {
          order: {
            include: { client: { select: { name: true } } },
          },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Moliyaviy kalendar"
        subtitle="Kelayotgan to'lovlar (bo'lib to'lash jadvali)"
      />
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Sana</th>
              <th className="text-left px-5 py-3">Buyurtma</th>
              <th className="text-left px-5 py-3">Mijoz</th>
              <th className="text-right px-5 py-3">Summa</th>
              <th className="text-right px-5 py-3">To'landi</th>
              <th className="text-left px-5 py-3">Holat</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">
                  {formatDate(it.dueDate)}
                </td>
                <td className="px-5 py-3 text-primary">
                  {it.schedule.order.orderNumber}
                </td>
                <td className="px-5 py-3">
                  {it.schedule.order.client?.name ??
                    it.schedule.order.clientNameSnapshot ??
                    "—"}
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  {formatMoney(it.amount, it.schedule.currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatMoney(it.paidAmount, it.schedule.currency)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`chip ${
                      it.status === "PAID"
                        ? "bg-emerald-100 text-emerald-700"
                        : it.status === "OVERDUE"
                          ? "bg-rose-100 text-rose-700"
                          : it.status === "PARTIAL"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {scheduleItemStatusLabel[it.status]}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-soft">
                  Kelayotgan to'lovlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
