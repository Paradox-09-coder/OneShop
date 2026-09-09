import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  name: z.string().min(1),
  sortOrder: z.number().default(0),
  parentId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("settings.write");
    const body = Create.parse(await req.json());
    const cat = await prisma.productCategory.create({ data: body });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "CREATE",
        description: `Kategoriya yaratildi: ${cat.name}`,
      },
    });
    return jsonOk({ category: cat });
  } catch (e) {
    return handleError(e);
  }
}
