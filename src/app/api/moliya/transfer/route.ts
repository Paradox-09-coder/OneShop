import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

// Hisoblar orasida pul ko'chirish (masalan naqd kassadan bank hisobiga).
// Meeting: "cho'ntakdan u cho'ntakka olib o'tish. Kartadan naqdga yoki
// naqtdan kartaga" (1:03:22-1:04:39). Ikkita Payment yozuvi (chiqim +
// kirim) yaratadi va ikkala hisobning balanceCache'ini yangilaydi.

const Body = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("finance.write");
    const body = Body.parse(await req.json());

    if (body.fromAccountId === body.toAccountId) {
      return jsonErr("Manba va manzil hisob bir xil bo'lishi mumkin emas", 422);
    }

    const [from, to] = await Promise.all([
      prisma.account.findUnique({ where: { id: body.fromAccountId } }),
      prisma.account.findUnique({ where: { id: body.toAccountId } }),
    ]);
    if (!from || !to) return jsonErr("Hisob topilmadi", 404);
    // Meeting'da aynan shu holat sinovdan o'tkazilgan: "naqd kassada
    // yo'q bo'lsa, olmadi" (1:04:23) — yetarli mablag' bo'lmasa ko'chirish
    // bloklanishi kerak, hisob manfiyga tushib qolmasligi kerak.
    if (from.balanceCache < body.amount) {
      return jsonErr(
        `${from.name}da yetarli mablag' yo'q — mavjud: ${from.balanceCache.toLocaleString("ru-RU")} ${from.currency}`,
        422
      );
    }
    if (from.currency !== to.currency) {
      return jsonErr(
        `Valyutalar mos emas (${from.currency} → ${to.currency}) — hozircha faqat bir xil valyutadagi hisoblar orasida ko'chirish mumkin`,
        422
      );
    }

    const outType = from.type === "CASH" ? "CASH_OUT" : "BANK_OUT";
    const inType = to.type === "CASH" ? "CASH_IN" : "BANK_IN";
    const note = body.note?.trim();

    await prisma.$transaction([
      prisma.account.update({
        where: { id: from.id },
        data: { balanceCache: { decrement: body.amount } },
      }),
      prisma.account.update({
        where: { id: to.id },
        data: { balanceCache: { increment: body.amount } },
      }),
      prisma.payment.create({
        data: {
          type: outType,
          accountId: from.id,
          amount: body.amount,
          currency: from.currency,
          sourceType: "MANUAL",
          description: note
            ? `Ko'chirish → ${to.name}: ${note}`
            : `Ko'chirish → ${to.name}`,
          createdById: session.id,
        },
      }),
      prisma.payment.create({
        data: {
          type: inType,
          accountId: to.id,
          amount: body.amount,
          currency: to.currency,
          sourceType: "MANUAL",
          description: note
            ? `Ko'chirish ← ${from.name}: ${note}`
            : `Ko'chirish ← ${from.name}`,
          createdById: session.id,
        },
      }),
    ]);

    return jsonOk({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
