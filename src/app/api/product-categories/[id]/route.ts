import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("settings.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const cat = await prisma.productCategory.update({ where: { id }, data: body });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "UPDATE",
        description: `Kategoriya: ${cat.name}`,
      },
    });
    return jsonOk({ category: cat });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("settings.write");
    const { id } = await params;
    const usedCount = await prisma.catalogProduct.count({
      where: { categoryId: id },
    });
    if (usedCount > 0) {
      return jsonErr(
        `Bu kategoriyada ${usedCount} ta mahsulot bor. Avval mahsulotlarni ko'chiring.`,
        409,
        "IN_USE"
      );
    }
    await prisma.productCategory.delete({ where: { id } });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "DELETE",
        description: `Kategoriya o'chirildi: ${id}`,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
