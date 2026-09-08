import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatNumber } from "@/lib/utils";
import { unitTypeLabel, rollStatusLabel } from "@/lib/labels";
import { Package, Plus, AlertTriangle } from "lucide-react";

export default async function WarehousePage() {
  const [products, rolls, lots] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      take: 100,
      include: {
        _count: { select: { lots: true, rolls: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.inventoryRoll.findMany({
      where: { status: { not: "DEPLETED" } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { catalogProduct: { select: { name: true, sku: true } } },
    }),
    prisma.inventoryLot.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { catalogProduct: { select: { name: true, sku: true } } },
    }),
  ]);

  const lowStock = lots.filter((l) => l.qty <= l.lowStockThreshold && l.lowStockThreshold > 0);

  return (
    <div>
      <PageHeader
        title="Omborxona"
        subtitle="Mahsulotlar, partiyalar va rulonlar"
        actions={
          <Link
            href="/katalog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border font-semibold hover:bg-gray-50"
          >
            <Plus size={16} /> Katalog
          </Link>
        }
      />

      {lowStock.length > 0 && (
        <div className="panel p-4 mb-4 border-l-4 border-l-warning bg-warning/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-warning" />
            <span className="font-bold">Kam qoldiq: {lowStock.length} ta partiya</span>
          </div>
          <p className="text-sm text-ink-soft">
            Chegaraga yaqinlashgan partiyalarni tekshiring
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Rulonlar ({rolls.length})</h3>
          {rolls.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">Rulonlar yo'q</p>
          ) : (
            <div className="space-y-2">
              {rolls.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {r.catalogProduct.name}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {r.totalWidthMm}×{r.totalLengthMm}mm — qoldiq:{" "}
                      {formatNumber(r.remainingLengthMm)}mm
                    </p>
                  </div>
                  <span
                    className={`chip ${
                      r.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "DEPLETED"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {rollStatusLabel[r.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-5">
          <h3 className="font-bold mb-3">Partiyalar ({lots.length})</h3>
          {lots.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">Partiyalar yo'q</p>
          ) : (
            <div className="space-y-2">
              {lots.slice(0, 8).map((l) => (
                <div
                  key={l.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {l.catalogProduct.name}
                    </p>
                    <p className="text-xs text-ink-soft">SKU: {l.catalogProduct.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {formatNumber(l.qty)} {unitTypeLabel[l.unitType]}
                    </p>
                    {l.qty <= l.lowStockThreshold && l.lowStockThreshold > 0 && (
                      <p className="text-xs text-danger">Kam!</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold">Katalog mahsulotlari</h3>
        </div>
        {products.length === 0 ? (
          <EmptyState
            title="Katalog bo'sh"
            message="Katalog sahifasidan mahsulotlarni qo'shing"
            icon={<Package size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Nomi</th>
                  <th className="text-left px-5 py-3">SKU</th>
                  <th className="text-left px-5 py-3">Kategoriya</th>
                  <th className="text-left px-5 py-3">Birligi</th>
                  <th className="text-right px-5 py-3">Narx</th>
                  <th className="text-center px-5 py-3">Partiyalar</th>
                  <th className="text-center px-5 py-3">Rulonlar</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 font-semibold">{p.name}</td>
                    <td className="px-5 py-3 text-ink-soft">{p.sku}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3">{unitTypeLabel[p.unitType]}</td>
                    <td className="px-5 py-3 text-right">
                      {formatMoney(p.basePrice ?? 0, p.basePriceCurrency)}
                    </td>
                    <td className="px-5 py-3 text-center">{p._count.lots}</td>
                    <td className="px-5 py-3 text-center">{p._count.rolls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
