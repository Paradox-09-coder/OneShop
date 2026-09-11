import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { canTransition } from "@/lib/state-machine";
import {
  computeRecipeRequirements,
  consumeMaterialsForOrder,
  restoreMaterialsForOrder,
  type LowStockHit,
} from "@/lib/production";
import { sendGroupMessage, escape } from "@/lib/telegram";

function itemsSummary(items: { productNameSnapshot: string; quantity: number }[]): string {
  if (items.length === 0) return "—";
  return items
    .map((it) => `${it.quantity}× ${it.productNameSnapshot}`)
    .join(", ");
}

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

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
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
    let lowStockHits: LowStockHit[] = [];

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
        lowStockHits = await consumeMaterialsForOrder(tx, id, session.id);
      }

      // READY'dan chiqib ketilganda (orqaga yoki bekor) — qaytaradi
      if (leavingReady) {
        await restoreMaterialsForOrder(tx, id, session.id);
      }
    });

    // Guruhga xabar — bazaga yozilgandan keyin, tashqi so'rov sifatida
    // (muvaffaqiyatsiz bo'lsa ham asosiy jarayonga ta'sir qilmasin).
    // "Buyurtma tayyor/jo'natishga tayyor" bosqichi — ishlab chiqarishda
    // READY, savdoda esa YETKAZILMOQDA (ikkalasi ham "haydovchiga topshirish
    // uchun tayyor" degani, shuning uchun bitta xabar shakli ishlatiladi).
    const enteringYetkazilmoqda =
      !isManufacturing && to === "YETKAZILMOQDA" && order.status !== "YETKAZILMOQDA";
    if ((isManufacturing && enteringReady) || enteringYetkazilmoqda) {
      await sendGroupMessage(
        `🎉 <b>Buyurtma tayyor!</b>\n` +
          `📦 ${escape(order.orderNumber)}\n` +
          `👤 ${escape(order.clientNameSnapshot ?? "—")} — ${escape(order.clientPhoneSnapshot ?? "—")}\n` +
          `🧾 ${escape(itemsSummary(order.items))}\n` +
          `💰 ${(order.agreedAmount ?? 0).toLocaleString("ru-RU")} ${order.orderCurrency}`
      ).catch(() => {});
    }
    if (shortageWarning) {
      await sendGroupMessage(
        `⚠️ <b>Xomashyo yetmaydi</b> — ${escape(order.orderNumber)}\n${escape(shortageWarning)}`
      ).catch(() => {});
    }
    if (lowStockHits.length > 0) {
      const lines = lowStockHits
        .map(
          (h) =>
            `${escape(h.materialName)} — qoldi ${h.remainingQty.toFixed(1)} ${h.unit.toLowerCase()}`
        )
        .join("\n");
      await sendGroupMessage(
        `📉 <b>Kam qoldiq!</b>\n${lines}`
      ).catch(() => {});
    }

    return jsonOk({ ok: true, shortageWarning });
  } catch (e) {
    return handleError(e);
  }
}
