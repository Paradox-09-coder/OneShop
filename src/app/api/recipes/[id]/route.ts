import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  variantName: z.string().min(1).optional(),
  outputQty: z.number().positive().optional(),
  outputUnit: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]).optional(),
  laborCost: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        materialProductId: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]),
        wastePercent: z.number().min(0).max(100).default(0),
      })
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const recipe = await prisma.$transaction(async (tx) => {
      if (body.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }
      return tx.recipe.update({
        where: { id },
        data: {
          variantName: body.variantName,
          outputQty: body.outputQty,
          outputUnit: body.outputUnit,
          laborCost: body.laborCost,
          isActive: body.isActive,
          note: body.note,
          ...(body.ingredients
            ? {
                ingredients: {
                  create: body.ingredients,
                },
              }
            : {}),
        },
        include: { ingredients: true },
      });
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "UPDATE",
        description: `Retsept: ${recipe.variantName}`,
      },
    });
    return jsonOk({ recipe });
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
    await prisma.recipe.delete({ where: { id } });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "DELETE",
        description: `Retsept o'chirildi: ${id}`,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
