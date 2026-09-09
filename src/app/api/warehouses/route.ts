import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const body = Create.parse(await req.json());
    const wh = await prisma.warehouse.create({
      data: {
        name: body.name,
        address: body.address || null,
        isActive: body.isActive,
      },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "CREATE",
        description: `Ombor yaratildi: ${wh.name}`,
      },
    });
    return jsonOk({ warehouse: wh });
  } catch (e) {
    return handleError(e);
  }
}
