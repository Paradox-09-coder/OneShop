// Bosqichlar soddalashtirilgandan keyin — RETAIL/WHOLESALE buyurtmalar
// endi faqat BUYURTMA_OLINDI/YETKAZILMOQDA/YAKUNLANDI/CANCELLED bosqichlarida
// bo'ladi. Eski YANGI_SOROV/MASLAHAT_BERILDI/NARX_KELISHILDI holatidagi
// buyurtmalarni BUYURTMA_OLINDI'ga o'tkazadi (POS buyurtmalarga tegmaydi —
// ular hali ham YANGI_SOROV/YAKUNLANDI ishlatadi).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const affected = await prisma.order.findMany({
    where: {
      type: { in: ["RETAIL", "WHOLESALE"] },
      status: { in: ["YANGI_SOROV", "MASLAHAT_BERILDI", "NARX_KELISHILDI"] },
    },
    select: { id: true, orderNumber: true, status: true },
  });

  console.log(`${affected.length} ta buyurtma topildi:`);
  const byStatus = {};
  for (const o of affected) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  console.log(byStatus);

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
          reason: "Bosqichlar soddalashtirildi (avtomatik ko'chirish)",
        },
      }),
    ]);
  }

  console.log(`${affected.length} ta buyurtma "Buyurtma olindi"ga ko'chirildi.`);
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
