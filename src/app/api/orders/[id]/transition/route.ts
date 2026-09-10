import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { canTransition } from "@/lib/state-machine";
import {
  computeRecipeRequirements,
  consumeMaterialsForOrder,
  restoreMaterialsForOrder,
} from "@/lib/production";

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

    const isManufacturing = order.type === "MANUFACTURING";
    const enteringReady = to === "READY" && order.status !== "READY";
    const leavingReady = order.status === "READY" && to !== "READY";
    const enteringProcessing =
      to === "PROCESSING" && order.status !== "PROCESSING";

    let shortageWarning: string | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: to },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: to,
          changedById: session.id,
          reason,
        },
      });
      await tx.log.create({
        data: {
          userId: session.id,
          screen: `/buyurtmalar/${id}`,
          action: "TRANSITION",
          description: `${order.orderNumber}: ${order.status} → ${to}`,
        },
      });

      if (!isManufacturing) return;

      // PROCESSING'ga kirganda — retseptga qarab yetarli xomashyo bormi,
      // tekshiradi va yetmasa ogohlantiradi (bloklamaydi).
      if (enteringProcessing) {
        const reqs = await computeRecipeRequirements(tx, id);
        const short = reqs.filter((r) => r.shortage > 0);
        if (short.length > 0) {
          shortageWarning = short
            .map((r) => `${r.materialName}: yetmaydi ${r.shortage.toFixed(1)} ${r.unit.toLowerCase()}`)
            .join("; ");
          await tx.notification.create({
            data: {
              type: "WARNING",
              title: `Xomashyo yetmaydi — ${order.orderNumber}`,
              body: shortageWarning,
              link: `/buyurtmalar/${id}`,
            },
          });
        }
      }

      // READY'ga kirganda — xomashyoni haqiqatda ayiradi (StockMovement OUT)
      if (enteringReady) {
        await consumeMaterialsForOrder(tx, id, session.id);
      }

      // READY'dan chiqib ketilganda (orqaga yoki bekor) — qaytaradi
      if (leavingReady) {
        await restoreMaterialsForOrder(tx, id, session.id);
      }
    });

    return jsonOk({ ok: true, shortageWarning });
  } catch (e) {
    return handleError(e);
  }
}
