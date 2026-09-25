import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

// Oylik/avans to'lash — meetingda kelishilgan: xodim oyligi ham xuddi
// ijara/kommunal kabi qo'lda kiritiladigan chiqim, faqat aynan shu
// xodimga bog'lab (Oyliklar sahifasida "qaysi oydan necha pul oldi"
// ko'rinishi uchun). Hisobdan pul ayiriladi va tarixga (Tranzaksiyalar)
// yoziladi — xuddi boshqa chiqimlar kabi.
//
// Har bir to'lov o'zining PayrollAccrual qatoriga ega (bitta oyda
// avans + qolgan qism kabi bir necha marta to'lanishi mumkin) va shu
// qatorni yaratgan Payment'ga `sourceId` orqali bog'lanadi — shu
// bog'lanish tufayli tahrirlash/o'chirishda aynan qaysi tranzaksiyani
// va qaysi hisobni tuzatish kerakligini aniq bilamiz.

const Body = z.object({
  employeeId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Oy YYYY-MM ko'rinishida bo'lishi kerak"),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("payroll.write");
    const body = Body.parse(await req.json());

    const employee = await prisma.employee.findUnique({
      where: { counterpartyId: body.employeeId },
      include: { counterparty: { select: { name: true } } },
    });
    if (!employee) return jsonErr("Xodim topilmadi", 404);

    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
    });
    if (!account) return jsonErr("Hisob topilmadi", 404);
    if (account.balanceCache < body.amount) {
      return jsonErr(
        `${account.name}da yetarli mablag' yo'q — mavjud: ${account.balanceCache.toLocaleString("ru-RU")} ${account.currency}`,
        422
      );
    }

    const type = account.type === "CASH" ? "CASH_OUT" : "BANK_OUT";
    const description = body.note?.trim() || `Oylik — ${body.period}`;

    const accrual = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: { balanceCache: { decrement: body.amount } },
      });
      const payment = await tx.payment.create({
        data: {
          type,
          accountId: account.id,
          amount: body.amount,
          currency: account.currency,
          counterpartyId: employee.counterpartyId,
          counterpartyNameSnapshot: employee.counterparty.name,
          description,
          sourceType: "PAYROLL",
          createdById: session.id,
        },
      });
      const created = await tx.payrollAccrual.create({
        data: {
          employeeId: employee.counterpartyId,
          period: body.period,
          amount: body.amount,
          currency: account.currency,
          note: body.note?.trim() || undefined,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { sourceId: created.id },
      });
      return created;
    });

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/xodimlar/oylik",
        action: "CREATE",
        description: `Oylik to'landi: ${employee.counterparty.name} — ${body.amount} ${account.currency} (${body.period})`,
      },
    });

    return jsonOk({ accrual });
  } catch (e) {
    return handleError(e);
  }
}
