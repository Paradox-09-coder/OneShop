import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().nullish(),
  unitType: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]).default("DONA"),
  baseCost: z.number().nullish(),
  basePrice: z.number().nullish(),
  baseCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]).default("UZS"),
  color: z.string().nullish(),
  lowStockThreshold: z.number().default(0),
  isSellable: z.boolean().default(true),
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
        categoryId: body.categoryId ?? null,
        unitType: body.unitType,
        baseCost: body.baseCost ?? null,
        baseCostCurrency: body.baseCurrency,
        basePrice: body.basePrice ?? null,
        basePriceCurrency: body.baseCurrency,
        color: body.color ?? null,
        lowStockThreshold: body.lowStockThreshold,
        isSellable: body.isSellable,
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
