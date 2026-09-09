import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  unitType: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]).default("DONA"),
  baseCost: z.number().nullable().optional(),
  basePrice: z.number().nullable().optional(),
  baseCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]).default("UZS"),
  color: z.string().optional(),
  lowStockThreshold: z.number().default(0),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const body = Create.parse(await req.json());
    const exists = await prisma.catalogProduct.findUnique({
      where: { sku: body.sku },
    });
    if (exists) return jsonErr("Bu SKU allaqachon bor", 409, "SKU_TAKEN");

    const product = await prisma.catalogProduct.create({
      data: {
        sku: body.sku,
        name: body.name,
        categoryId: body.categoryId || null,
        unitType: body.unitType,
        baseCost: body.baseCost,
        baseCostCurrency: body.baseCurrency,
        basePrice: body.basePrice,
        basePriceCurrency: body.baseCurrency,
        color: body.color,
        lowStockThreshold: body.lowStockThreshold,
      },
    });

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "CREATE",
        description: `Mahsulot: ${product.name} (${product.sku})`,
      },
    });
    return jsonOk({ product });
  } catch (e) {
    return handleError(e);
  }
}
