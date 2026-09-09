import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const wh = await prisma.warehouse.update({
      where: { id },
      data: {
        ...body,
        address: body.address === undefined ? undefined : body.address || null,
      },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "UPDATE",
        description: `Ombor: ${wh.name}`,
      },
    });
    return jsonOk({ warehouse: wh });
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
    const usedCount = await prisma.inventoryLot.count({
      where: { warehouseId: id },
    });
    if (usedCount > 0) {
      return jsonErr(
        `Bu omborda ${usedCount} ta partiya bor. Avval partiyalarni ko'chiring.`,
        409,
        "IN_USE"
      );
    }
    await prisma.warehouse.delete({ where: { id } });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "DELETE",
        description: `Ombor o'chirildi: ${id}`,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
