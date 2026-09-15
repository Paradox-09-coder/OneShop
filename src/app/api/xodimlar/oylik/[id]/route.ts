import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Payment, PayrollAccrual } from "@prisma/client";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

// Tahrirlash/o'chirish endi Payment.sourceId orqali bog'lanadi, lekin
// bu funksiya chiqishidan OLDIN (avvalgi deploy versiyasida) to'langan
// oyliklar bu bog'lanishsiz qolgan — Payment yaratilgan, hisobdan pul
// ayirilgan, lekin sourceId hech qachon yozilmagan. Shunday "yetim"
// tranzaksiyani xodim+summa bo'yicha moslab topamiz va orqaga qarab
// bog'lab qo'yamiz — aks holda foydalanuvchi bu eski yozuvlarni
// tahrirlay/o'chira olmay qoladi.
async function findLinkedPayment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  accrual: PayrollAccrual
): Promise<Payment | null> {
  const linked = await tx.payment.findFirst({
    where: { sourceType: "PAYROLL", sourceId: accrual.id },
  });
  if (linked) return linked;
  const orphan = await tx.payment.findFirst({
    where: {
      sourceType: "PAYROLL",
      sourceId: null,
      counterpartyId: accrual.employeeId,
      amount: accrual.amount,
    },
  });
  if (orphan) {
    await tx.payment.update({ where: { id: orphan.id }, data: { sourceId: accrual.id } });
  }
  return orphan;
}

const Body = z.object({
  employeeId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Oy YYYY-MM ko'rinishida bo'lishi kerak"),
  note: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("payroll.write");
    const { id } = await params;
    const body = Body.parse(await req.json());

    const accrual = await prisma.payrollAccrual.findUnique({ where: { id } });
    if (!accrual) return jsonErr("Yozuv topilmadi", 404);

    const employee = await prisma.employee.findUnique({
      where: { counterpartyId: body.employeeId },
      include: { counterparty: { select: { name: true } } },
    });
    if (!employee) return jsonErr("Xodim topilmadi", 404);

    const newAccount = await prisma.account.findUnique({
      where: { id: body.accountId },
    });
    if (!newAccount) return jsonErr("Hisob topilmadi", 404);

    const adjusted = await prisma.$transaction(async (tx) => {
      const payment = await findLinkedPayment(tx, accrual);
      // Bog'liq tranzaksiya topilsa — eski hisobga summani qaytarib, yangi
      // hisobdan yangi summani ayiramiz. Topilmasa (masalan qo'lda/demo
      // yozuv) — faqat yozuvning o'zi to'g'irlanadi, hisobga tegilmaydi.
      if (payment?.accountId) {
        await tx.account.update({
          where: { id: payment.accountId },
          data: { balanceCache: { increment: payment.amount } },
        });
        await tx.account.update({
          where: { id: newAccount.id },
          data: { balanceCache: { decrement: body.amount } },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            accountId: newAccount.id,
            amount: body.amount,
            currency: newAccount.currency,
            type: newAccount.type === "CASH" ? "CASH_OUT" : "BANK_OUT",
            counterpartyId: employee.counterpartyId,
            counterpartyNameSnapshot: employee.counterparty.name,
            description: body.note?.trim() || `Oylik — ${body.period}`,
          },
        });
      }
      await tx.payrollAccrual.update({
        where: { id },
        data: {
          employeeId: employee.counterpartyId,
          period: body.period,
          amount: body.amount,
          currency: newAccount.currency,
          note: body.note?.trim() || undefined,
        },
      });
      return { hadPayment: !!payment?.accountId };
    });

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/xodimlar/oylik",
        action: "UPDATE",
        description: `Oylik to'g'irlandi: ${employee.counterparty.name} — ${body.amount} ${newAccount.currency} (${body.period})`,
      },
    });

    return jsonOk({
      ok: true,
      warning: adjusted.hadPayment
        ? undefined
        : "Bu yozuv bog'liq tranzaksiyasiz edi — yozuv to'g'irlandi, lekin hech qanday hisob balansi o'zgartirilmadi.",
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("payroll.write");
    const { id } = await params;

    const accrual = await prisma.payrollAccrual.findUnique({
      where: { id },
      include: { employee: { include: { counterparty: { select: { name: true } } } } },
    });
    if (!accrual) return jsonErr("Yozuv topilmadi", 404);

    await prisma.$transaction(async (tx) => {
      const payment = await findLinkedPayment(tx, accrual);
      if (payment?.accountId) {
        await tx.account.update({
          where: { id: payment.accountId },
          data: { balanceCache: { increment: payment.amount } },
        });
      }
      if (payment) {
        await tx.payment.delete({ where: { id: payment.id } });
      }
      await tx.payrollAccrual.delete({ where: { id } });
    });

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/xodimlar/oylik",
        action: "DELETE",
        description: `Oylik yozuvi o'chirildi: ${accrual.employee.counterparty.name} — ${accrual.amount} ${accrual.currency} (${accrual.period}), pul hisobga qaytarildi`,
      },
    });

    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
