import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";

const CreateOrder = z.object({
  clientId: z.string().min(1),
  type: z.enum(["RETAIL", "WHOLESALE", "MANUFACTURING", "POS"]),
  orderCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  exchangeRate: z.number().positive().nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        catalogProductId: z.string().min(1),
        productName: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
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

    const initialStatus =
      body.type === "MANUFACTURING" ? "PROPOSAL" : "YANGI_SOROV";

    const order = await prisma.$transaction(async (tx) => {
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
          note: body.note,
          items: {
            create: body.items.map((it) => ({
              catalogProductId: it.catalogProductId,
              productNameSnapshot: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              currency: body.orderCurrency,
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

    return jsonOk({ order });
  } catch (e) {
    return handleError(e);
  }
}
