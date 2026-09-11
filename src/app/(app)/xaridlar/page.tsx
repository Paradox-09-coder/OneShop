import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import { shipmentStatusLabel } from "@/lib/labels";
import { Truck } from "lucide-react";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import type { Prisma, ShipmentStatus } from "@prisma/client";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    take?: string;
  }>;
}) {
  const sp = await searchParams;
  const take = Number(sp.take) || 30;

  const where: Prisma.ShipmentWhereInput = {
    ...(sp.status ? { status: sp.status as ShipmentStatus } : {}),
    ...(sp.from || sp.to
      ? {
          createdAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { containerNumber: { contains: sp.q, mode: "insensitive" } },
            { supplier: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const shipments = await prisma.shipment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { supplier: true, _count: { select: { items: true } } },
    take: take + 1,
  });
  const hasMore = shipments.length > take;
  const visible = shipments.slice(0, take);

  return (
    <div>
      <PageHeader
        title="Konteynerlar"
        subtitle="Ta'minotchidan qabul qilingan konteynerlar"
      />

      <ListToolbar
        searchPlaceholder="Konteyner raqami yoki ta'minotchi bo'yicha qidirish..."
        selects={[
          {
            key: "status",
            label: "Holat",
            options: Object.entries(shipmentStatusLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
        dateRange={{ label: "Sana" }}
      />

      <div className="panel overflow-hidden">
        {shipments.length === 0 ? (
          <EmptyState
            title="Konteynerlar yo'q"
            message="Ta'minotchidan mahsulot qabul qilinganda bu yerda ko'rinadi"
            icon={<Truck size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Raqami</th>
                  <th className="text-left px-5 py-3">Ta'minotchi</th>
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-left px-5 py-3">Holat</th>
                  <th className="text-center px-5 py-3">Mahsulotlar</th>
                  <th className="text-right px-5 py-3">Umumiy tannarx</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="px-5 py-3 font-semibold">
                      {s.containerNumber ?? "—"}
                    </td>
                    <td className="px-5 py-3">{s.supplier.name}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {formatDate(s.arrivalDate ?? s.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`chip ${
                          s.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : s.status === "ARRIVED"
                              ? "bg-sky-100 text-sky-700"
                              : s.status === "IN_TRANSIT"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {shipmentStatusLabel[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">{s._count.items}</td>
                    <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                      {formatMoney(s.totalCost, s.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LoadMore hasMore={hasMore} />
      </div>
    </div>
  );
}
