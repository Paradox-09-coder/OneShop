import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

// Bir martalik ko'chirish — RETAIL_FLOW soddalashtirilgandan keyin eski
// YANGI_SOROV/MASLAHAT_BERILDI/NARX_KELISHILDI holatidagi chakana/ulgurji
// buyurtmalarni BUYURTMA_OLINDI'ga o'tkazadi (Kanban'da endi ular uchun
// ustun yo'q — aks holda ko'rinmay qolib qolardi). Idempotent: qayta
// chaqirilsa, mos buyurtma qolmagani uchun hech narsa qilmaydi.
export async function POST() {
  try {
    const session = await requireApiPermission("settings.write");

    const affected = await prisma.order.findMany({
      where: {
        type: { in: ["RETAIL", "WHOLESALE"] },
        status: { in: ["YANGI_SOROV", "MASLAHAT_BERILDI", "NARX_KELISHILDI"] },
      },
      select: { id: true, orderNumber: true, status: true },
    });

    for (const o of affected) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: o.id },
          data: { status: "BUYURTMA_OLINDI" },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: o.id,
            fromStatus: o.status,
            toStatus: "BUYURTMA_OLINDI",
            changedById: session.id,
            reason: "Bosqichlar soddalashtirildi (avtomatik ko'chirish)",
          },
        }),
      ]);
    }

    return jsonOk({
      migrated: affected.length,
      orderNumbers: affected.map((o) => o.orderNumber),
    });
  } catch (e) {
    return handleError(e);
  }
}
