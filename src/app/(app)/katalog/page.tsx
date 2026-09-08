import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { unitTypeLabel } from "@/lib/labels";
import EmptyState from "@/components/empty-state";
import { Layers } from "lucide-react";

export default async function CatalogPage() {
  const [products, categories] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Katalog"
        subtitle={`${products.length} ta mahsulot • ${categories.length} ta kategoriya`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Kategoriyalar</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-soft">Yo'q</p>
          ) : (
            <ul className="space-y-1">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="p-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 panel overflow-hidden">
          {products.length === 0 ? (
            <EmptyState
              title="Mahsulot yo'q"
              message="Seed skriptini ishga tushiring: npm run db:seed"
              icon={<Layers size={22} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                    <th className="text-left px-5 py-3">SKU</th>
                    <th className="text-left px-5 py-3">Nomi</th>
                    <th className="text-left px-5 py-3">Kategoriya</th>
                    <th className="text-left px-5 py-3">Birligi</th>
                    <th className="text-right px-5 py-3">Tannarx</th>
                    <th className="text-right px-5 py-3">Narx</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="px-5 py-3 text-ink-soft">{p.sku}</td>
                      <td className="px-5 py-3 font-semibold">{p.name}</td>
                      <td className="px-5 py-3">{p.category?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        {unitTypeLabel[p.unitType]}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {p.baseCost != null
                          ? formatMoney(p.baseCost, p.baseCostCurrency)
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {p.basePrice != null
                          ? formatMoney(p.basePrice, p.basePriceCurrency)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
