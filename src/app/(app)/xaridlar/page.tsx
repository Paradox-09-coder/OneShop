import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import { shipmentStatusLabel } from "@/lib/labels";
import { Truck } from "lucide-react";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import SectionTabs from "@/components/section-tabs";
import type { Prisma, ShipmentStatus } from "@prisma/client";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/xaridlar?${qs}` : "/xaridlar";
  }

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

  const [visible, totalCount] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, _count: { select: { items: true } } },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shipment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <PageHeader
        title="Konteynerlar"
        subtitle="Ta'minotchidan qabul qilingan konteynerlar"
      />

      <SectionTabs
        tabs={[
          { label: "Mahsulotlar", href: "/omborxona" },
          { label: "Katalog", href: "/katalog" },
          { label: "Konteynerlar", href: "/xaridlar" },
        ]}
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
        {visible.length === 0 ? (
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
