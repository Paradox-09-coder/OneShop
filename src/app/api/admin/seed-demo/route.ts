import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleError, jsonErr, jsonOk } from "@/lib/api";

// Bir martalik yordamchi endpoint: "Yana" (load more) tugmasini sinash
// uchun ro'yxatlarga (mijozlar, buyurtmalar, tranzaksiyalar, kontragentlar,
// katalog, konteynerlar) ko'p sonli demo yozuv qo'shadi. Faqat rahbariyat
// chaqira oladi. Ishlatib bo'lgach shu faylni o'chirib tashlash mumkin.

const FIRST_NAMES = [
  "Sanjar", "Bekzod", "Jasur", "Dilshod", "Ravshan", "Aziz", "Botir", "Farrux",
  "Shavkat", "Ulug'bek", "Nodira", "Gulnora", "Malika", "Zarina", "Nilufar",
  "Feruza", "Dildora", "Sevara", "Kamola", "Madina", "Sardor", "Otabek",
  "Jamshid", "Rustam", "Anvar", "Bobur", "Doniyor", "Elyor", "Farhod", "Hasan",
];
const LAST_NAMES = [
  "Karimov", "Rahmonov", "Yusupov", "Tursunov", "Abdullayev", "Nazarov",
  "Ergashev", "Xolmatov", "Saidov", "Umarov", "Qodirov", "Toshpulatov",
  "Islomov", "Mirzayev", "Yoqubov", "Rashidov", "Sultonov", "Xudoyberdiyev",
];
const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Samarqand", "Buxoro", "Farg'ona",
  "Andijon", "Namangan", "Qashqadaryo", "Surxondaryo", "Xorazm",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randPhone() {
  return `+9989${randInt(10000000, 99999999)}`;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!["SUPER_ADMIN", "RAHBAR", "ADMIN"].includes(session.role)) {
      return jsonErr("Faqat rahbariyat uchun", 403, "FORBIDDEN");
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body?.count) || 200, 10), 500);

    const sellable = await prisma.catalogProduct.findMany({
      where: { isSellable: true, status: "active" },
    });
    if (sellable.length === 0) {
      return jsonErr("Sotiladigan mahsulot topilmadi — avval katalogni to'ldiring", 400);
    }
    const mainWh = await prisma.warehouse.findFirst({ where: { isActive: true } });

    // ── 1) Mijozlar (CLIENT) ────────────────────────────────
    const clientIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const c = await prisma.counterparty.create({
        data: {
          type: "CLIENT",
          name,
          phone: randPhone(),
          region: pick(REGIONS),
          clientProfile: {
            create: {
              customerKind: Math.random() < 0.3 ? "RESELLER" : "RETAIL",
              funnel: "LEAD",
              stage: "new",
            },
          },
        },
        select: { id: true, name: true, phone: true },
      });
      clientIds.push(c.id);
    }

    // ── 2) Kontragentlar (SUPPLIER/OTHER) — kontragentlar sahifasi uchun ──
    const extraKontragentCount = Math.round(count * 0.25);
    for (let i = 0; i < extraKontragentCount; i++) {
      const isSupplier = Math.random() < 0.6;
      await prisma.counterparty.create({
        data: {
          type: isSupplier ? "SUPPLIER" : "OTHER",
          name: isSupplier
            ? `OOO "${pick(LAST_NAMES)} Trade" ${randInt(1, 999)}`
            : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} (haydovchi)`,
          phone: randPhone(),
          ...(isSupplier ? { supplierProfile: { create: {} } } : {}),
        },
      });
    }

    // ── 3) Buyurtmalar (Order + OrderItem) ──────────────────
    const statuses = [
      "YANGI_SOROV", "MASLAHAT_BERILDI", "NARX_KELISHILDI",
      "BUYURTMA_OLINDI", "YETKAZILMOQDA", "YAKUNLANDI", "CANCELLED",
    ] as const;
    const channels = ["INSTAGRAM", "TELEGRAM", "PHONE", "WALK_IN", "WEBSITE"] as const;
    const orderIds: { id: string; clientId: string }[] = [];
    const existingCount = await prisma.order.count();
    for (let i = 0; i < count; i++) {
      const client = pick(clientIds.map((id) => id));
      const clientRow = await prisma.counterparty.findUnique({ where: { id: client } });
      const product = pick(sellable);
      const qty = randInt(1, 8);
      const unitPrice = product.basePrice ?? 100_000;
      const total = qty * unitPrice;
      const status = pick(statuses);
      const createdAt = daysAgo(randInt(0, 120));
      const order = await prisma.order.create({
        data: {
          orderNumber: `BZ-${existingCount + 1000 + i}`,
          type: Math.random() < 0.2 ? "WHOLESALE" : "RETAIL",
          status,
          priority: Math.random() < 0.08 ? "VIP" : Math.random() < 0.2 ? "HIGH" : "NORMAL",
          channel: pick(channels),
          clientId: client,
          clientNameSnapshot: clientRow?.name,
          clientPhoneSnapshot: clientRow?.phone,
          orderCurrency: "UZS",
          agreedAmount: total,
          estimatedAmount: total,
          paidAmount: status === "CANCELLED" ? 0 : Math.random() < 0.5 ? total : total * 0.5,
          taxRate: 0,
          createdAt,
          items: {
            create: {
              catalogProductId: product.id,
              productNameSnapshot: product.name,
              quantity: qty,
              unitPrice,
            },
          },
        },
        select: { id: true, clientId: true },
      });
      orderIds.push({ id: order.id, clientId: order.clientId! });
    }

    // ── 4) Tranzaksiyalar (Payment) ──────────────────────────
    const txCategories = await prisma.transactionCategory.findMany();
    const salesCat = txCategories.find((c) => c.name === "Sotuv") ?? txCategories[0];
    for (let i = 0; i < count; i++) {
      const order = pick(orderIds);
      const useBank = Math.random() < 0.35;
      await prisma.payment.create({
        data: {
          date: daysAgo(randInt(0, 120)),
          type: useBank ? "BANK_IN" : "CASH_IN",
          accountId: useBank ? "acc-bank" : "acc-kassa",
          counterpartyId: order.clientId,
          amount: randInt(300_000, 8_000_000),
          currency: "UZS",
          categoryId: salesCat?.id,
          orderId: order.id,
          sourceType: "ORDER",
          sourceId: order.id,
          description: "Demo to'lov (Yana tugmasini sinash uchun)",
        },
      });
    }

    // ── 5) Qo'shimcha katalog mahsulotlari (Omborxona/Katalog) ──
    const extraProductCount = Math.round(count * 0.3);
    const cat = await prisma.productCategory.findFirst();
    for (let i = 0; i < extraProductCount; i++) {
      const sku = `DEMO-${Date.now()}-${i}`;
      const cost = randInt(50_000, 300_000);
      const price = Math.round(cost * 1.35);
      const cp = await prisma.catalogProduct.create({
        data: {
          sku,
          name: `Demo mahsulot ${i + 1}`,
          categoryId: cat?.id,
          unitType: "DONA",
          baseCost: cost,
          basePrice: price,
          warehouseId: mainWh?.id,
          lowStockThreshold: 5,
          isSellable: true,
        },
      });
      if (mainWh) {
        await prisma.inventoryLot.create({
          data: {
            catalogProductId: cp.id,
            warehouseId: mainWh.id,
            qty: randInt(5, 60),
            unitType: "DONA",
            cost,
            price,
            lowStockThreshold: 5,
          },
        });
      }
    }

    // ── 6) Konteynerlar (Shipment) — Xaridlar sahifasi uchun ──
    const suppliers = await prisma.counterparty.findMany({
      where: { type: "SUPPLIER" },
      take: 20,
    });
    const shipmentCount = Math.round(count * 0.2);
    const shipStatuses = ["IN_TRANSIT", "ARRIVED", "COMPLETED"] as const;
    for (let i = 0; i < shipmentCount && suppliers.length > 0; i++) {
      const supplier = pick(suppliers);
      const cost = randInt(1000, 15000);
      await prisma.shipment.create({
        data: {
          supplierId: supplier.id,
          containerNumber: `DEMO-${randInt(1000, 9999)}/26`,
          status: pick(shipStatuses),
          shippingDate: daysAgo(randInt(5, 90)),
          currency: "USD",
          totalProductCost: cost,
          totalExpenses: Math.round(cost * 0.06),
          totalCost: Math.round(cost * 1.06),
          note: "Demo konteyner (Yana tugmasini sinash uchun)",
        },
      });
    }

    return jsonOk({
      clients: clientIds.length,
      kontragents: extraKontragentCount,
      orders: orderIds.length,
      payments: count,
      products: extraProductCount,
      shipments: shipmentCount,
    });
  } catch (e) {
    return handleError(e);
  }
}
