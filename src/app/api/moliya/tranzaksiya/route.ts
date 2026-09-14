import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

// Qo'lda kirim/chiqim tranzaksiyasi qo'shish (masalan naqd sotuv,
// tashkilotdan tashqari xarajat) — hisobning balanceCache'ini yangilaydi.

const Body = z.object({
  accountId: z.string().min(1),
  kind: z.enum(["IN", "OUT"]),
  amount: z.number().positive(),
  counterpartyId: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("finance.write");
    const body = Body.parse(await req.json());

    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
    });
    if (!account) return jsonErr("Hisob topilmadi", 404);

    const type =
      account.type === "CASH"
        ? body.kind === "IN"
          ? "CASH_IN"
          : "CASH_OUT"
        : body.kind === "IN"
          ? "BANK_IN"
          : "BANK_OUT";

    let counterpartyName: string | undefined;
    if (body.counterpartyId) {
      const cp = await prisma.counterparty.findUnique({
        where: { id: body.counterpartyId },
        select: { name: true },
      });
      counterpartyName = cp?.name;
    }

    const [, payment] = await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: {
          balanceCache:
            body.kind === "IN"
              ? { increment: body.amount }
              : { decrement: body.amount },
        },
      }),
      prisma.payment.create({
        data: {
          type,
          date: body.date ? new Date(body.date) : undefined,
          accountId: account.id,
          amount: body.amount,
          currency: account.currency,
          counterpartyId: body.counterpartyId || undefined,
          counterpartyNameSnapshot: counterpartyName,
          description: body.description?.trim() || undefined,
          sourceType: "MANUAL",
          createdById: session.id,
        },
      }),
    ]);

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/moliya/tranzaksiyalar",
        action: "CREATE",
        description: `Tranzaksiya qo'shildi: ${body.kind === "IN" ? "kirim" : "chiqim"} ${body.amount} ${account.currency} (${account.name})`,
      },
    });

    return jsonOk({ payment });
  } catch (e) {
    return handleError(e);
  }
}
