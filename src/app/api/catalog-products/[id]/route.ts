import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  unitType: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]).optional(),
  baseCost: z.number().nullable().optional(),
  basePrice: z.number().nullable().optional(),
  baseCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]).optional(),
  color: z.string().nullable().optional(),
  lowStockThreshold: z.number().optional(),
  status: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const patch: Record<string, unknown> = {};
    if (body.sku) patch.sku = body.sku;
    if (body.name) patch.name = body.name;
    if (body.categoryId !== undefined) patch.categoryId = body.categoryId || null;
    if (body.unitType) patch.unitType = body.unitType;
    if (body.baseCost !== undefined) patch.baseCost = body.baseCost;
    if (body.basePrice !== undefined) patch.basePrice = body.basePrice;
    if (body.baseCurrency) {
      patch.baseCostCurrency = body.baseCurrency;
      patch.basePriceCurrency = body.baseCurrency;
    }
    if (body.color !== undefined) patch.color = body.color;
    if (body.lowStockThreshold !== undefined)
      patch.lowStockThreshold = body.lowStockThreshold;
    if (body.status) patch.status = body.status;

    const product = await prisma.catalogProduct.update({
      where: { id },
      data: patch,
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "UPDATE",
        description: `Mahsulot: ${product.name}`,
      },
    });
    return jsonOk({ product });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const { id } = await params;
    const used = await prisma.orderItem.count({
      where: { catalogProductId: id },
    });
    if (used > 0) {
      return jsonErr(
        `Bu mahsulot ${used} ta buyurtmada ishlatilgan. Faqat "Faol emas" qilib qo'yishingiz mumkin.`,
        409,
        "IN_USE"
      );
    }
    await prisma.catalogProduct.delete({ where: { id } });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "DELETE",
        description: `Mahsulot o'chirildi: ${id}`,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
