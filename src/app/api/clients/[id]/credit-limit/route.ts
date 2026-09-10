import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Body = z.object({
  creditLimit: z.number().min(0),
  creditLimitCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  creditLimitEnabled: z.boolean(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("clients.write");
    const { id } = await params;
    const body = Body.parse(await req.json());

    const profile = await prisma.clientProfile.upsert({
      where: { counterpartyId: id },
      update: body,
      create: { counterpartyId: id, customerKind: "RETAIL", ...body },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: `/mijozlar/${id}`,
        action: "UPDATE",
        description: `Kredit limit: ${body.creditLimit} ${body.creditLimitCurrency}${
          body.creditLimitEnabled ? " (yoqilgan)" : " (o'chirilgan)"
        }`,
      },
    });
    return jsonOk({ profile });
  } catch (e) {
    return handleError(e);
  }
}
