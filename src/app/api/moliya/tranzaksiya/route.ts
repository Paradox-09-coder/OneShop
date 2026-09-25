import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { sendMessage, escape } from "@/lib/telegram";

// Qo'lda kirim/chiqim tranzaksiyasi qo'shish (masalan naqd sotuv,
// tashkilotdan tashqari xarajat) — hisobning balanceCache'ini yangilaydi.

const Body = z.object({
  accountId: z.string().min(1),
  kind: z.enum(["IN", "OUT"]),
  amount: z.number().positive(),
  counterpartyId: z.string().optional(),
  orderId: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

interface CounterpartyMeta {
  telegram_id?: number;
}

// Formadagi "Sana" faqat kun sifatida tanlanadi (vaqt yo'q) — buni
// to'g'ridan-to'g'ri `new Date("2026-09-25")` qilsak, bu YARIM TUNGA
// (UTC) teng bo'lib, Toshkent vaqtida "05:00" bo'lib chiqadi. Natijada
// bir kunda kiritilgan barcha tranzaksiyalar bir xil vaqtga "yopishib"
// qolib, Tranzaksiyalar ro'yxatidagi tartib (va ko'rsatilgan vaqt) real
// kiritilish ketma-ketligini aks ettirmay qoladi. Shu sababli tanlangan
// kunga joriy soat/daqiqa/soniyani qo'shib qo'yamiz.
function resolveDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const now = new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
}

// Meeting: mijoz Telegram bot orqali pul o'tkazganda, qaysi shot-faktura
// (buyurtma) uchun ekanini yopib/aniqlashtirib berishni so'rab ogohlantirish
// yuboriladi — B2B mijozlar uchun.
async function notifyClientAboutPayment(
  counterpartyId: string,
  amount: number,
  currency: string,
  linkedOrderId: string | undefined
) {
  const client = await prisma.counterparty.findUnique({
    where: { id: counterpartyId },
  });
  if (!client || client.type !== "CLIENT") return;
  const telegramId = (client.metadata as CounterpartyMeta | null)?.telegram_id;
  if (!telegramId) return;

  if (linkedOrderId) {
    const order = await prisma.order.findUnique({ where: { id: linkedOrderId } });
    if (!order) return;
    const remaining = (order.agreedAmount ?? 0) - order.paidAmount;
    await sendMessage(
      telegramId,
      `✅ <b>To'lovingiz qabul qilindi</b>\n\n` +
        `Summa: <b>${amount.toLocaleString("ru-RU")} ${currency}</b>\n` +
        `Buyurtma: <b>${escape(order.orderNumber)}</b>\n\n` +
        (remaining > 0.01
          ? `Iltimos, shu buyurtma (shot-faktura) bo'yicha qolgan hisobingizni yopib bering: ` +
            `<b>${remaining.toLocaleString("ru-RU")} ${order.orderCurrency}</b>`
          : `Ushbu buyurtma bo'yicha hisobingiz to'liq yopildi. Rahmat!`)
    ).catch(() => {});
    return;
  }

  const openOrders = await prisma.order.findMany({
    where: { clientId: counterpartyId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const open = openOrders.filter((o) => (o.agreedAmount ?? 0) - o.paidAmount > 0.01);
  if (open.length === 0) return;

  const lines = open
    .map(
      (o) =>
        `• ${escape(o.orderNumber)} — qolgan: ${((o.agreedAmount ?? 0) - o.paidAmount).toLocaleString("ru-RU")} ${o.orderCurrency}`
    )
    .join("\n");
  await sendMessage(
    telegramId,
    `✅ <b>To'lovingiz qabul qilindi</b>\n\n` +
      `Summa: <b>${amount.toLocaleString("ru-RU")} ${currency}</b>\n\n` +
      `Iltimos, ushbu to'lov qaysi shot-faktura (buyurtma) uchun ekanini bildiring, shuni yopib beramiz:\n${lines}`
  ).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("finance.write");
    const body = Body.parse(await req.json());

    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
    });
    if (!account) return jsonErr("Hisob topilmadi", 404);
    // Meeting'da sinovdan o'tkazilgan: "naqd kassada yo'q bo'lsa, olmadi"
    // (1:04:23) — chiqim hisobni manfiyga tushirmasligi kerak.
    if (body.kind === "OUT" && account.balanceCache < body.amount) {
      return jsonErr(
        `${account.name}da yetarli mablag' yo'q — mavjud: ${account.balanceCache.toLocaleString("ru-RU")} ${account.currency}`,
        422
      );
    }

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

    // Buyurtmaga bog'lash faqat kirim (mijozdan pul kelganda) va buyurtma
    // shu kontragentga tegishli bo'lsa ma'noga ega.
    let linkedOrderId: string | undefined;
    if (body.orderId && body.kind === "IN" && body.counterpartyId) {
      const order = await prisma.order.findUnique({ where: { id: body.orderId } });
      if (order && order.clientId === body.counterpartyId) {
        linkedOrderId = order.id;
      }
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [
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
          date: resolveDate(body.date),
          accountId: account.id,
          amount: body.amount,
          currency: account.currency,
          counterpartyId: body.counterpartyId || undefined,
          counterpartyNameSnapshot: counterpartyName,
          description: body.description?.trim() || undefined,
          sourceType: "MANUAL",
          orderId: linkedOrderId,
          createdById: session.id,
        },
      }),
    ];
    if (linkedOrderId) {
      ops.push(
        prisma.order.update({
          where: { id: linkedOrderId },
          data: { paidAmount: { increment: body.amount } },
        })
      );
    }

    const [, payment] = await prisma.$transaction(ops);

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/moliya/tranzaksiyalar",
        action: "CREATE",
        description: `Tranzaksiya qo'shildi: ${body.kind === "IN" ? "kirim" : "chiqim"} ${body.amount} ${account.currency} (${account.name})`,
      },
    });

    if (body.kind === "IN" && body.counterpartyId) {
      notifyClientAboutPayment(
        body.counterpartyId,
        body.amount,
        account.currency,
        linkedOrderId
      ).catch(() => {});
    }

    return jsonOk({ payment });
  } catch (e) {
    return handleError(e);
  }
}
