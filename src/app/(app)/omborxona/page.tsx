import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatNumber } from "@/lib/utils";
import { unitTypeLabel, rollStatusLabel } from "@/lib/labels";
import { Package, AlertTriangle } from "lucide-react";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import SectionTabs from "@/components/section-tabs";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    q?: string;
    categoryId?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const isLowStock = sp.filter === "low-stock";
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/omborxona?${qs}` : "/omborxona";
  }

  const productWhere: Prisma.CatalogProductWhereInput = {
    status: "active",
    ...(sp.categoryId ? { categoryId: sp.categoryId } : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { sku: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, productCount, rolls, lots, categories] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: productWhere,
      orderBy: { name: "asc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { lots: true, rolls: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.catalogProduct.count({ where: productWhere }),
    prisma.inventoryRoll.findMany({
      where: { status: { not: "DEPLETED" } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { catalogProduct: { select: { name: true, sku: true } } },
    }),
    prisma.inventoryLot.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { catalogProduct: { select: { name: true, sku: true } } },
    }),
    prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const lowStock = lots.filter((l) => l.qty <= l.lowStockThreshold && l.lowStockThreshold > 0);
  const visibleLots = isLowStock ? lowStock : lots;
  const visibleProducts = products;
  const totalPages = Math.max(1, Math.ceil(productCount / pageSize));

  return (
    <div>
      <PageHeader
        title="Omborxona"
        subtitle={
          isLowStock
            ? `Faqat kam qoldiqli — ${lowStock.length} ta`
            : "Mahsulotlar, partiyalar va rulonlar"
        }
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
              <Link
                href="/omborxona"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  !isLowStock ? "bg-white shadow-sm" : "text-ink-soft"
                }`}
              >
                Barchasi
              </Link>
              <Link
                href="/omborxona?filter=low-stock"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  isLowStock ? "bg-white shadow-sm text-danger" : "text-ink-soft"
                }`}
              >
                Kam qoldiq
              </Link>
            </div>
          </div>
        }
      />

      <SectionTabs
        tabs={[
          { label: "Mahsulotlar", href: "/omborxona" },
          { label: "Katalog", href: "/katalog" },
        ]}
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
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {rolls.map((r) => (
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
          <h3 className="font-bold mb-3">
            {isLowStock ? "Kam qoldiqli partiyalar" : "Partiyalar"} ({visibleLots.length})
          </h3>
          {visibleLots.length === 0 ? (
            <p className="text-sm text-ink-soft py-4 text-center">
              {isLowStock ? "Kam qoldiqli partiyalar yo'q — hammasi yetarli!" : "Partiyalar yo'q"}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {visibleLots.map((l) => (
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
          <h3 className="font-bold mb-3">Katalog mahsulotlari</h3>
          <ListToolbar
            searchPlaceholder="Nomi yoki SKU bo'yicha qidirish..."
            selects={[
              {
                key: "categoryId",
                label: "Kategoriya",
                options: categories.map((c) => ({ value: c.id, label: c.name })),
              },
            ]}
          />
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
                {visibleProducts.map((p) => (
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
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          totalCount={productCount}
          pageSize={pageSize}
          buildHref={(p) => hrefWith({ page: String(p) })}
        />
      </div>
    </div>
  );
}
