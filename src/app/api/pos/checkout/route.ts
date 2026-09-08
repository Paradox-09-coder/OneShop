import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";

const Body = z.object({
  clientId: z.string().min(1),
  accountId: z.string().min(1),
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

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("orders.write");
    const body = Body.parse(await req.json());
    const total = body.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice,
      0
    );

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.counterparty.findUnique({
        where: { id: body.clientId },
      });
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber("PS"),
          type: "POS",
          status: "YAKUNLANDI",
          orderCurrency: "UZS",
          clientId: client?.id,
          clientNameSnapshot: client?.name,
          agreedAmount: total,
          paidAmount: total,
          items: {
            create: body.items.map((it) => ({
              catalogProductId: it.catalogProductId,
              productNameSnapshot: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            })),
          },
        },
      });
      // Payment
      await tx.payment.create({
        data: {
          type: "CASH_IN",
          accountId: body.accountId,
          amount: total,
          currency: "UZS",
          sourceType: "ORDER",
          sourceId: order.id,
          sourceLabel: order.orderNumber,
          orderId: order.id,
          description: `POS sotuv — ${order.orderNumber}`,
          createdById: session.id,
        },
      });
      // Update account balance
      await tx.account.update({
        where: { id: body.accountId },
        data: { balanceCache: { increment: total } },
      });

      return order;
    });

    return jsonOk({ order: result });
  } catch (e) {
    return handleError(e);
  }
}
