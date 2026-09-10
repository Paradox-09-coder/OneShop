import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { ArrowLeft } from "lucide-react";
import RecipeEditor from "./editor";

export const dynamic = "force-dynamic";

export default async function ProductRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, recipes, materials] = await Promise.all([
    prisma.catalogProduct.findUnique({ where: { id } }),
    prisma.recipe.findMany({
      where: { catalogProductId: id },
      include: {
        ingredients: {
          include: { materialProduct: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.catalogProduct.findMany({
      where: {
        status: "active",
        // Xomashyo: narx 0 (sotilmaydigan) yoki alohida kategoriya
        id: { not: id },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        unitType: true,
        baseCost: true,
        baseCostCurrency: true,
      },
    }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/katalog"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary"
        >
          <ArrowLeft size={14} /> Katalog
        </Link>
      </div>

      <PageHeader
        title={`Retsept — ${product.name}`}
        subtitle={`SKU: ${product.sku} • Har 1 ${product.unitType.toLowerCase()} uchun qancha xomashyo`}
      />

      <RecipeEditor
        productId={product.id}
        recipes={recipes.map((r) => ({
          id: r.id,
          variantName: r.variantName,
          outputQty: r.outputQty,
          outputUnit: r.outputUnit,
          laborCost: r.laborCost,
          note: r.note,
          isActive: r.isActive,
          ingredients: r.ingredients.map((it) => ({
            id: it.id,
            materialProductId: it.materialProductId,
            materialName: it.materialProduct.name,
            materialSku: it.materialProduct.sku,
            quantity: it.quantity,
            unit: it.unit,
            wastePercent: it.wastePercent,
            cost: it.materialProduct.baseCost ?? 0,
            costCurrency: it.materialProduct.baseCostCurrency,
          })),
        }))}
        materials={materials.map((m) => ({
          id: m.id,
          name: m.name,
          sku: m.sku,
          unit: m.unitType,
          cost: m.baseCost ?? 0,
          costCurrency: m.baseCostCurrency,
        }))}
      />
    </div>
  );
}
