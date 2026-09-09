import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CASH", "BANK"]).optional(),
  currency: z.enum(["UZS", "USD", "EUR", "RUB"]).optional(),
  balanceCache: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("finance.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const account = await prisma.account.update({ where: { id }, data: body });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "UPDATE",
        description: `Hisob o'zgartirildi: ${account.name}`,
      },
    });
    return jsonOk({ account });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("finance.write");
    const { id } = await params;
    const usedInPayments = await prisma.payment.count({ where: { accountId: id } });
    if (usedInPayments > 0) {
      return jsonErr(
        "Bu hisobda tranzaksiyalar bor. Faqat 'Faol emas' qilib qo'yishingiz mumkin.",
        409,
        "IN_USE"
      );
    }
    await prisma.account.delete({ where: { id } });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "DELETE",
        description: `Hisob o'chirildi: ${id}`,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
