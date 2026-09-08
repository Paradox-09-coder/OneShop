import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { canTransition } from "@/lib/state-machine";

const Body = z.object({
  to: z.enum([
    "YANGI_SOROV",
    "MASLAHAT_BERILDI",
    "NARX_KELISHILDI",
    "BUYURTMA_OLINDI",
    "YETKAZILMOQDA",
    "YAKUNLANDI",
    "PROPOSAL",
    "NEW",
    "PROCESSING",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ]),
  reason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("orders.write");
    const { id } = await params;
    const { to, reason } = Body.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return jsonErr("Buyurtma topilmadi", 404);

    if (!canTransition(order.type, order.status, to)) {
      return jsonErr(
        `${order.status} → ${to} o'tishga ruxsat yo'q`,
        422,
        "INVALID_TRANSITION"
      );
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: to },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: to,
          changedById: session.id,
          reason,
        },
      }),
      prisma.log.create({
        data: {
          userId: session.id,
          screen: `/buyurtmalar/${id}`,
          action: "TRANSITION",
          description: `${order.orderNumber}: ${order.status} → ${to}`,
        },
      }),
    ]);

    return jsonOk({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
