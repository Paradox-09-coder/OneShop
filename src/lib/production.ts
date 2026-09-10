// Ishlab chiqarish — retsept (BOM) asosida xomashyo iste'moli.
//
// Acham-fashion'dan o'rganilgan naqshlar (backend/src/routes/entries.ts):
//  - Retsept HAR DOIM jonli o'qiladi (snapshot emas) — ingredient miqdorini
//    o'zgartirsangiz, hali iste'mol qilinmagan buyurtmalarga ta'sir qiladi.
//  - Yetishmovchilik BLOKLAMAYDI — clamp-at-zero, faqat ogohlantiradi
//    (meeting: "Yetmasa — ogohlantirish", Acham: Math.max(0, ...)).
//  - Iste'mol FIZIK voqeaga bog'langan (bizda: READY bosqichiga o'tish),
//    status maydonining o'ziga emas — qayta-qayta chaqirilsa ham xato
//    bo'lmasligi uchun faqat holat chegarasidan o'tganda ishga tushadi.
//  - Bekor qilinsa / orqaga qaytarilsa — TESKARI qaytariladi (Acham buni
//    qilmagan — bu bizning ustunligimiz).

import type { Prisma } from "@prisma/client";

export interface MaterialRequirement {
  materialProductId: string;
  materialName: string;
  unit: string;
  requiredQty: number;
  availableQty: number;
  shortage: number; // > 0 bo'lsa yetishmaydi
}

/**
 * Buyurtma mahsulotlari uchun retsept asosida qancha xomashyo kerakligini
 * hisoblaydi va joriy ombordagi miqdor bilan solishtiradi.  Faqat o'qiydi —
 * hech narsani o'zgartirmaydi.  PROCESSING bosqichiga o'tishda ogohlantirish
 * uchun ishlatiladi.
 */
export async function computeRecipeRequirements(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<MaterialRequirement[]> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { catalogProductId: true, quantity: true },
  });

  // materialProductId -> required qty (jamlangan)
  const needed = new Map<string, number>();

  for (const item of items) {
    const recipe = await tx.recipe.findFirst({
      where: { catalogProductId: item.catalogProductId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { ingredients: true },
    });
    if (!recipe) continue; // retsept yo'q — xomashyo talab qilinmaydi (masalan, savdo tovarlari)

    const scale = item.quantity / (recipe.outputQty || 1);
    for (const ing of recipe.ingredients) {
      const withWaste = ing.quantity * (1 + ing.wastePercent / 100) * scale;
      needed.set(
        ing.materialProductId,
        (needed.get(ing.materialProductId) ?? 0) + withWaste
      );
    }
  }

  if (needed.size === 0) return [];

  const materialIds = Array.from(needed.keys());
  const [materials, lots] = await Promise.all([
    tx.catalogProduct.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, unitType: true },
    }),
    tx.inventoryLot.groupBy({
      by: ["catalogProductId"],
      where: { catalogProductId: { in: materialIds } },
      _sum: { qty: true },
    }),
  ]);

  const availableMap = new Map(
    lots.map((l) => [l.catalogProductId, l._sum.qty ?? 0])
  );
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  return materialIds.map((id) => {
    const required = needed.get(id) ?? 0;
    const available = availableMap.get(id) ?? 0;
    const mat = materialMap.get(id);
    return {
      materialProductId: id,
      materialName: mat?.name ?? id,
      unit: mat?.unitType ?? "DONA",
      requiredQty: required,
      availableQty: available,
      shortage: Math.max(0, required - available),
    };
  });
}

/**
 * Xomashyoni haqiqatda ayiradi (StockMovement OUT) — READY bosqichiga
 * o'tganda chaqiriladi.  Lotlarni FIFO (eng eski birinchi) tartibda
 * kamaytiradi, InventoryLot.qty manfiy bo'lib qolmasligi uchun 0 da
 * to'xtaydi (Acham naqshi).  Yetmagan qism jimgina hisobdan chiqadi —
 * chunki bu bosqichda ogohlantirish allaqachon PROCESSING'da berilgan.
 */
export async function consumeMaterialsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId?: string
): Promise<void> {
  const reqs = await computeRecipeRequirements(tx, orderId);

  for (const req of reqs) {
    let remaining = req.requiredQty;
    const lots = await tx.inventoryLot.findMany({
      where: { catalogProductId: req.materialProductId, qty: { gt: 0 } },
      orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
    });

    for (const lot of lots) {
      if (remaining <= 0) break;
      const deduct = Math.min(lot.qty, remaining);
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: { qty: Math.max(0, lot.qty - deduct) },
      });
      await tx.stockMovement.create({
        data: {
          catalogProductId: req.materialProductId,
          inventoryLotId: lot.id,
          warehouseId: lot.warehouseId,
          type: "OUT",
          qty: deduct,
          reason: "Retsept (BOM) iste'moli",
          orderId,
          createdById: userId,
        },
      });
      remaining -= deduct;
    }
    // remaining > 0 bo'lsa — lotlar tugagan, jimgina qoldiriladi (clamp-at-zero,
    // Acham naqshi). Ogohlantirish PROCESSING bosqichida allaqachon berilgan.
  }
}

/**
 * Iste'mol qilingan xomashyoni teskari qaytaradi — READY'dan chiqib
 * ketilganda (orqaga yoki CANCELLED).  Shu buyurtma uchun yozilgan barcha
 * "Retsept (BOM) iste'moli" OUT harakatlarini topib, ularni aynan o'sha
 * lotlarga qaytaradi.  Acham buni umuman qilmagan — bu bizning tuzatishimiz.
 */
export async function restoreMaterialsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId?: string
): Promise<void> {
  const consumed = await tx.stockMovement.findMany({
    where: { orderId, type: "OUT", reason: "Retsept (BOM) iste'moli" },
  });

  for (const mv of consumed) {
    if (!mv.inventoryLotId) continue;
    const lot = await tx.inventoryLot.findUnique({
      where: { id: mv.inventoryLotId },
    });
    if (!lot) continue;
    await tx.inventoryLot.update({
      where: { id: lot.id },
      data: { qty: lot.qty + mv.qty },
    });
    await tx.stockMovement.create({
      data: {
        catalogProductId: mv.catalogProductId,
        inventoryLotId: lot.id,
        warehouseId: lot.warehouseId,
        type: "IN",
        qty: mv.qty,
        reason: "Retsept iste'moli qaytarildi (holat orqaga)",
        orderId,
        createdById: userId,
      },
    });
  }
}
