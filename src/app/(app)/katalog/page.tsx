import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { Layers, Package, Zap, Battery, Plug, Cable } from "lucide-react";
import ProductManager from "./product-manager";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import SectionTabs from "@/components/section-tabs";

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
  searchParams: Promise<{
    cat?: string;
    q?: string;
    turi?: string;
    take?: string;
  }>;
}) {
  const sp = await searchParams;
  const categoryId = sp.cat;
  const take = Number(sp.take) || 30;

  const [categories, allMatching, productCounts] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.catalogProduct.findMany({
      where: {
        status: "active",
        ...(categoryId && categoryId !== "all"
          ? { categoryId }
          : {}),
        ...(sp.turi ? { isSellable: sp.turi === "sotiladi" } : {}),
        ...(sp.q
          ? {
              OR: [
                { name: { contains: sp.q, mode: "insensitive" } },
                { sku: { contains: sp.q, mode: "insensitive" } },
              ],
            }
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
  const hasMore = allMatching.length > take;
  const products = allMatching.slice(0, take);

  return (
    <div>
      <PageHeader
        title="Katalog"
        subtitle={
          activeCategory
            ? `${activeCategory.name} — ${allMatching.length} ta mahsulot`
            : `${totalCount} ta mahsulot • ${categories.length} ta kategoriya`
        }
      />

      <SectionTabs
        tabs={[
          { label: "Mahsulotlar", href: "/omborxona" },
          { label: "Katalog", href: "/katalog" },
          { label: "Konteynerlar", href: "/xaridlar" },
        ]}
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
        <div className="lg:col-span-3">
          <ListToolbar
            searchPlaceholder="Nomi yoki SKU bo'yicha qidirish..."
            selects={[
              {
                key: "turi",
                label: "Turi",
                options: [
                  { value: "sotiladi", label: "Sotiladi" },
                  { value: "xomashyo", label: "Xomashyo" },
                ],
              },
            ]}
          />
          <ProductManager
            products={products.map((p) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              categoryId: p.categoryId,
              categoryName: p.category?.name ?? null,
              unitType: p.unitType,
              baseCost: p.baseCost,
              baseCostCurrency: p.baseCostCurrency,
              basePrice: p.basePrice,
              basePriceCurrency: p.basePriceCurrency,
              color: p.color,
              lowStockThreshold: p.lowStockThreshold,
              isSellable: p.isSellable,
            }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            defaultCategoryId={categoryId && categoryId !== "all" ? categoryId : undefined}
          />
          <LoadMore hasMore={hasMore} />
        </div>
      </div>
    </div>
  );
}
