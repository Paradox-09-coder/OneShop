import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  catalogProductId: z.string().min(1),
  variantName: z.string().min(1).default("Standart"),
  outputQty: z.number().positive().default(1),
  outputUnit: z.enum(["DONA", "METR", "M2", "MM", "KG", "LITR"]).default("DONA"),
  laborCost: z.number().nullable().optional(),
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
    .min(1),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const body = Create.parse(await req.json());
    const recipe = await prisma.recipe.create({
      data: {
        catalogProductId: body.catalogProductId,
        variantName: body.variantName,
        outputQty: body.outputQty,
        outputUnit: body.outputUnit,
        laborCost: body.laborCost ?? null,
        note: body.note,
        ingredients: {
          create: body.ingredients,
        },
      },
      include: { ingredients: true },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/katalog",
        action: "CREATE",
        description: `Retsept: ${recipe.variantName}`,
      },
    });
    return jsonOk({ recipe });
  } catch (e) {
    return handleError(e);
  }
}
