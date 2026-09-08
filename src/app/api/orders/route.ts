import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";

const CreateOrder = z.object({
  clientId: z.string().min(1),
  type: z.enum(["RETAIL", "WHOLESALE", "MANUFACTURING", "POS"]),
  orderCurrency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  taxRate: z.number().min(0).max(100).default(0),
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

    const totalRaw = body.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice,
      0
    );
    const taxAmount = (totalRaw * body.taxRate) / 100;
    const total = totalRaw + taxAmount;

    // Snapshot the current FX rate for non-UZS orders
    let exchangeRate: number | null = null;
    if (body.orderCurrency !== "UZS") {
      const setting = await prisma.setting.findUnique({
        where: { key: "exchange_rate_usd" },
      });
      exchangeRate = Number(
        ((setting?.value as { rate?: number } | null)?.rate) ??
          process.env.DEFAULT_EXCHANGE_RATE ??
          12200
      );
    }

    const initialStatus =
      body.type === "MANUFACTURING" ? "PROPOSAL" : "YANGI_SOROV";

    const order = await prisma.$transaction(async (tx) => {
      const client = await tx.counterparty.findUnique({
        where: { id: body.clientId },
      });
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
