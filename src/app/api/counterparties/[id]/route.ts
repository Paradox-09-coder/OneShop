import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CLIENT", "SUPPLIER", "EMPLOYEE", "FOUNDER", "LENDER", "OTHER"]).optional(),
  phone: z.string().nullish(),
  phone2: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  telegram: z.string().nullish(),
  address: z.string().nullish(),
  inn: z.string().nullish(),
  status: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("counterparties.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const patch: Record<string, unknown> = {};
    if (body.name) patch.name = body.name;
    if (body.type) patch.type = body.type;
    if (body.phone !== undefined) patch.phone = body.phone || null;
    if (body.phone2 !== undefined) patch.phone2 = body.phone2 || null;
    if (body.email !== undefined) patch.email = body.email || null;
    if (body.telegram !== undefined) patch.telegram = body.telegram || null;
    if (body.address !== undefined) patch.address = body.address || null;
    if (body.inn !== undefined) patch.inn = body.inn || null;
    if (body.status) patch.status = body.status;

    const party = await prisma.counterparty.update({
      where: { id },
      data: patch,
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/kontragentlar",
        action: "UPDATE",
        description: `Kontragent: ${party.name}`,
      },
    });
    return jsonOk({ party });
  } catch (e) {
    return handleError(e);
  }
}
