import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatDateTime } from "@/lib/utils";

export default async function AttendancePage() {
  const attendance = await prisma.attendance.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: { employee: { include: { counterparty: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Davomad"
        subtitle="Xodimlar ish vaqti"
      />
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Xodim</th>
              <th className="text-left px-5 py-3">Kirdi</th>
              <th className="text-left px-5 py-3">Chiqdi</th>
              <th className="text-right px-5 py-3">Soat</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-semibold">
                  {a.employee.counterparty.name}
                </td>
                <td className="px-5 py-3">{formatDateTime(a.clockIn)}</td>
                <td className="px-5 py-3">
                  {a.clockOut ? formatDateTime(a.clockOut) : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {a.totalHours?.toFixed(1) ?? "—"}
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Davomad yozuvlari yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
