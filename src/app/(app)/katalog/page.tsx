import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney } from "@/lib/utils";
import { unitTypeLabel } from "@/lib/labels";
import EmptyState from "@/components/empty-state";
import { Layers, Package, Zap, Battery, Plug, Cable } from "lucide-react";

export const dynamic = "force-dynamic";

// Category → icon + static Tailwind classes (avoid dynamic template strings)
const CATEGORY_STYLES: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string }
> = {
  Generatorlar: { icon: <Zap size={22} />, bg: "bg-amber-100", text: "text-amber-600" },
  Stabilizatorlar: { icon: <Battery size={22} />, bg: "bg-sky-100", text: "text-sky-600" },
  UPS: { icon: <Plug size={22} />, bg: "bg-violet-100", text: "text-violet-600" },
  Kabellar: { icon: <Cable size={22} />, bg: "bg-emerald-100", text: "text-emerald-600" },
  Aksessuarlar: { icon: <Package size={22} />, bg: "bg-slate-100", text: "text-slate-600" },
};

function getStyle(name: string) {
  return (
    CATEGORY_STYLES[name] ?? {
      icon: <Layers size={22} />,
      bg: "bg-primary/10",
      text: "text-primary",
    }
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const categoryId = sp.cat;

  const [categories, products, productCounts] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.catalogProduct.findMany({
      where: {
        status: "active",
        ...(categoryId && categoryId !== "all"
          ? { categoryId }
          : {}),
      },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.catalogProduct.groupBy({
      by: ["categoryId"],
      where: { status: "active" },
      _count: true,
    }),
  ]);

  const countMap = Object.fromEntries(
    productCounts.map((c) => [c.categoryId ?? "none", c._count])
  );
  const totalCount = productCounts.reduce((s, c) => s + c._count, 0);
  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <div>
      <PageHeader
        title="Katalog"
        subtitle={
          activeCategory
            ? `${activeCategory.name} — ${products.length} ta mahsulot`
            : `${totalCount} ta mahsulot • ${categories.length} ta kategoriya`
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Kategoriya kartochkalari — chapda */}
        <div className="lg:col-span-1 space-y-2">
          <Link
            href="/katalog"
            className={`panel p-4 flex items-center gap-3 hover:border-primary transition ${
              !categoryId || categoryId === "all"
                ? "border-primary bg-primary/5"
                : ""
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Layers size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Barchasi</p>
              <p className="text-xs text-ink-soft">{totalCount} ta mahsulot</p>
            </div>
          </Link>

          {categories.map((c) => {
            const style = getStyle(c.name);
            const active = categoryId === c.id;
            const count = countMap[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                href={`/katalog?cat=${c.id}`}
                className={`panel p-4 flex items-center gap-3 hover:border-primary transition ${
                  active ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl grid place-items-center ${style.bg} ${style.text}`}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-xs text-ink-soft">{count} ta mahsulot</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mahsulotlar jadvali — o'ngda */}
        <div className="lg:col-span-3 panel overflow-hidden">
          {products.length === 0 ? (
            <EmptyState
              title={
                activeCategory
                  ? `"${activeCategory.name}" kategoriyasida mahsulot yo'q`
                  : "Mahsulot yo'q"
              }
              message="Yangi mahsulot qo'shish uchun buyoni ochish tugmasidan foydalaning"
              icon={<Layers size={22} />}
            />
          ) : (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
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
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3 text-ink-soft font-mono text-xs">
                        {p.sku}
                      </td>
                      <td className="px-5 py-3 font-semibold">{p.name}</td>
                      <td className="px-5 py-3">
                        {p.category?.name ?? "—"}
                      </td>
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
