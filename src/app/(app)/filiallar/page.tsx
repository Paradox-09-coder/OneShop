import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { Building2, ArrowRightLeft, Plus } from "lucide-react";
import TransferButton from "./transfer-button";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const [warehouses, transfers] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            catalogProducts: true,
            inventoryLots: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockTransfer.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Filiallar / Omborlar"
        subtitle={`${warehouses.length} ta faol filial, ${transfers.length} ta o'tkazma`}
        actions={<TransferButton warehouses={warehouses} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {warehouses.map((w) => (
          <div key={w.id} className="panel p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="font-bold">{w.name}</p>
                  {w.address && (
                    <p className="text-xs text-ink-soft">{w.address}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-xs text-ink-soft">Mahsulotlar</p>
                <p className="font-bold text-lg">{w._count.catalogProducts}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-xs text-ink-soft">Partiyalar</p>
                <p className="font-bold text-lg">{w._count.inventoryLots}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-primary" />
          <h3 className="font-bold">Ichki o'tkazmalar jurnali</h3>
        </div>
        {transfers.length === 0 ? (
          <p className="p-8 text-center text-ink-soft text-sm">
            O'tkazmalar yo'q — yuqoridagi tugma orqali yangi o'tkazma yarating
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                <th className="text-left px-5 py-3">№</th>
                <th className="text-left px-5 py-3">Sana</th>
                <th className="text-left px-5 py-3">Qayerdan</th>
                <th className="text-left px-5 py-3">Qayerga</th>
                <th className="text-center px-5 py-3">Mahsulotlar</th>
                <th className="text-left px-5 py-3">Holat</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="px-5 py-3 font-mono text-primary">
                    {t.transferNumber}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-5 py-3">{t.fromWarehouse.name}</td>
                  <td className="px-5 py-3">→ {t.toWarehouse.name}</td>
                  <td className="px-5 py-3 text-center">{t._count.items}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`chip ${
                        t.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : t.status === "IN_TRANSIT"
                            ? "bg-amber-100 text-amber-700"
                            : t.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.status === "PENDING"
                        ? "Kutilmoqda"
                        : t.status === "IN_TRANSIT"
                          ? "Yo'lda"
                          : t.status === "COMPLETED"
                            ? "Yakunlandi"
                            : "Bekor"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
