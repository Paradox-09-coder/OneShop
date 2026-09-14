import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";
import { sendGroupMessage, escape } from "@/lib/telegram";

const CreateOrder = z.object({
  clientId: z.string().min(1),
  type: z.enum(["RETAIL", "WHOLESALE", "MANUFACTURING", "POS"]),
  priority: z
    .enum(["NORMAL", "HIGH", "VIP", "URGENT_1D", "URGENT_3D", "URGENT_7D"])
    .default("NORMAL"),
  orderCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  exchangeRate: z.number().positive().nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  // To'lov usuli — To'liq to'lov/Zaklad hozirning o'zida pul qabul qilingan
  // hisobga (kassa/bank) tushadi; Qarz bo'lsa hech narsa olinmaydi, butun
  // summa qarz sifatida qoladi (agreedAmount - paidAmount orqali hisoblanadi).
  paymentType: z.enum(["FULL", "PARTIAL", "DEFERRED"]).default("DEFERRED"),
  depositAmount: z.number().min(0).optional(),
  paymentAccountId: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        catalogProductId: z.string().min(1),
        productName: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        recipeId: z.string().optional(),
      })
    )
    .min(1),
});

export async function GET() {
  try {
    await requireApiPermission("orders.read");
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { client: { select: { name: true } } },
    });
    return jsonOk({ orders });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("orders.write");
    const body = CreateOrder.parse(await req.json());

    const subtotal = body.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice,
      0
    );
    const discount =
      body.discountPercent > 0
        ? (subtotal * body.discountPercent) / 100
        : body.discountAmount;
    const afterDiscount = subtotal - discount;
    const tax =
      body.taxRate > 0
        ? (afterDiscount * body.taxRate) / 100
        : body.taxAmount;
    const total = afterDiscount + tax;

    const paidNow =
      body.paymentType === "FULL"
        ? total
        : body.paymentType === "PARTIAL"
          ? Math.min(body.depositAmount ?? 0, total)
          : 0;
    if (body.paymentType !== "DEFERRED" && !body.paymentAccountId) {
      return jsonErr("To'lov qabul qilinadigan hisobni tanlang", 422);
    }
    if (body.paymentType === "PARTIAL" && paidNow <= 0) {
      return jsonErr("Avans summasini kiriting", 422);
    }

    // Snapshot the exchange rate for non-UZS orders.
    // If the client supplied one, trust that; otherwise fall back to settings.
    let exchangeRate: number | null = null;
    if (body.orderCurrency !== "UZS") {
      if (body.exchangeRate) {
        exchangeRate = body.exchangeRate;
      } else {
        const setting = await prisma.setting.findUnique({
          where: { key: "exchange_rate_usd" },
        });
        exchangeRate = Number(
          ((setting?.value as { rate?: number } | null)?.rate) ??
            process.env.DEFAULT_EXCHANGE_RATE ??
            12200
        );
      }
    }

    // Chakana/ulgurji pipeline endi "Buyurtma olindi"dan boshlanadi —
    // so'rov/maslahat/narx bosqichlari CRM-lead darajasida hisoblanadi,
    // tizimga kiritilgan buyurtma allaqachon qabul qilingan hisoblanadi.
    // POS o'zining eski 2-bosqichli oqimini saqlab qoladi.
    const initialStatus =
      body.type === "MANUFACTURING"
        ? "PROPOSAL"
        : body.type === "POS"
          ? "YANGI_SOROV"
          : "BUYURTMA_OLINDI";

    const order = await prisma.$transaction(async (tx) => {
      let paymentAccount = null as Awaited<ReturnType<typeof tx.account.findUnique>>;
      if (paidNow > 0) {
        paymentAccount = await tx.account.findUnique({
          where: { id: body.paymentAccountId },
        });
        if (!paymentAccount) throw new Error("Hisob topilmadi");
        if (paymentAccount.currency !== body.orderCurrency) {
          throw new Error(
            `Hisob valyutasi mos emas (${paymentAccount.currency} — buyurtma ${body.orderCurrency}da)`
          );
        }
      }

      const client = await tx.counterparty.findUnique({
        where: { id: body.clientId },
        include: { clientProfile: true },
      });

      // Kredit limit tekshirish
      if (
        client?.clientProfile?.creditLimitEnabled &&
        client.clientProfile.creditLimit != null
      ) {
        // Umumiy hozirgi qarz (yakunlanmagan buyurtmalar bo'yicha)
        const outstanding = await tx.order.aggregate({
          where: {
            clientId: client.id,
            status: { not: "CANCELLED" },
          },
          _sum: { agreedAmount: true, paidAmount: true },
        });
        const currentDebt =
          (outstanding._sum.agreedAmount ?? 0) - (outstanding._sum.paidAmount ?? 0);
        const projected = currentDebt + total;
        if (projected > client.clientProfile.creditLimit) {
          throw new Error(
            `Kredit limit oshib ketdi: joriy qarz ${currentDebt.toLocaleString(
              "ru-RU"
            )} + yangi ${total.toLocaleString(
              "ru-RU"
            )} = ${projected.toLocaleString(
              "ru-RU"
            )} so'm. Ruxsat: ${client.clientProfile.creditLimit.toLocaleString(
              "ru-RU"
            )} so'm`
          );
        }
      }
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(
            body.type === "MANUFACTURING" ? "MF" : body.type === "POS" ? "PS" : "BZ"
          ),
          type: body.type,
          status: initialStatus,
          priority: body.priority,
          orderCurrency: body.orderCurrency,
          exchangeRateSnapshot: exchangeRate,
          taxRate: body.taxRate,
          discountPercent: body.discountPercent,
          discountAmount: discount,
          clientId: client?.id,
          clientNameSnapshot: client?.name,
          clientPhoneSnapshot: client?.phone,
          agreedAmount: total,
          estimatedAmount: total,
          paidAmount: paidNow,
          paymentType: body.paymentType,
          note: body.note,
          items: {
            create: body.items.map((it) => ({
              catalogProductId: it.catalogProductId,
              productNameSnapshot: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              currency: body.orderCurrency,
              recipeId: it.recipeId,
            })),
          },
          statusHistory: {
            create: {
              toStatus: initialStatus,
              changedById: session.id,
              reason: "Buyurtma yaratildi",
            },
          },
        },
      });
      if (paidNow > 0 && paymentAccount) {
        await tx.payment.create({
          data: {
            type: paymentAccount.type === "CASH" ? "CASH_IN" : "BANK_IN",
            accountId: paymentAccount.id,
            amount: paidNow,
            currency: body.orderCurrency,
            sourceType: "ORDER",
            sourceId: created.id,
            sourceLabel: created.orderNumber,
            orderId: created.id,
            counterpartyId: client?.id,
            counterpartyNameSnapshot: client?.name,
            description:
              body.paymentType === "FULL"
                ? `To'liq to'lov — ${created.orderNumber}`
                : `Zaklad (boshlang'ich to'lov) — ${created.orderNumber}`,
            createdById: session.id,
          },
        });
        await tx.account.update({
          where: { id: paymentAccount.id },
          data: { balanceCache: { increment: paidNow } },
        });
      }

      await tx.log.create({
        data: {
          userId: session.id,
          screen: "/buyurtmalar",
          action: "CREATE",
          description: `Buyurtma yaratildi: ${created.orderNumber}`,
        },
      });
      return created;
    });

    if (order.priority === "VIP") {
      await sendGroupMessage(
        `👑 <b>VIP buyurtma!</b>\n` +
          `📦 ${escape(order.orderNumber)}\n` +
          `👤 ${escape(order.clientNameSnapshot ?? "—")} — ${escape(order.clientPhoneSnapshot ?? "—")}\n` +
          `💰 ${(order.agreedAmount ?? 0).toLocaleString("ru-RU")} ${order.orderCurrency}`
      ).catch(() => {});
    }

    return jsonOk({ order });
  } catch (e) {
    return handleError(e);
  }
}
