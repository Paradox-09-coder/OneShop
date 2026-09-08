import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed boshlandi...");

  // ── Users ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "admin123",
    10
  );
  const admin = await prisma.user.upsert({
    where: { username: process.env.SEED_ADMIN_USERNAME ?? "admin" },
    update: {},
    create: {
      username: process.env.SEED_ADMIN_USERNAME ?? "admin",
      name: process.env.SEED_ADMIN_NAME ?? "Bosh Administrator",
      email: "admin@oneshop.local",
      password: adminHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ Admin:", admin.username);

  const cashierHash = await bcrypt.hash("kassir123", 10);
  const cashier = await prisma.user.upsert({
    where: { username: "kassir" },
    update: {},
    create: {
      username: "kassir",
      name: "Aziz Karimov",
      password: cashierHash,
      role: "SELLER",
    },
  });

  // ── Warehouse ─────────────────────────────────────────────
  const mainWh = await prisma.warehouse.upsert({
    where: { name: "Asosiy ombor" },
    update: {},
    create: { name: "Asosiy ombor", address: "Toshkent, Chilonzor" },
  });

  // ── Product categories ────────────────────────────────────
  const cats = await Promise.all(
    ["Generatorlar", "Stabilizatorlar", "UPS", "Kabellar", "Aksessuarlar"].map(
      (name, i) =>
        prisma.productCategory.upsert({
          where: { id: `cat-${i}` },
          update: {},
          create: { id: `cat-${i}`, name, sortOrder: i },
        })
    )
  );

  // ── Catalog products ──────────────────────────────────────
  const products = [
    {
      sku: "GEN-3000",
      name: "Generator 3kW benzin",
      category: cats[0].id,
      unit: "DONA" as const,
      cost: 3_500_000,
      price: 5_200_000,
    },
    {
      sku: "GEN-5500",
      name: "Generator 5.5kW benzin",
      category: cats[0].id,
      unit: "DONA" as const,
      cost: 6_200_000,
      price: 8_900_000,
    },
    {
      sku: "STB-5000",
      name: "Stabilizator 5000VA",
      category: cats[1].id,
      unit: "DONA" as const,
      cost: 1_800_000,
      price: 2_600_000,
    },
    {
      sku: "STB-10000",
      name: "Stabilizator 10000VA",
      category: cats[1].id,
      unit: "DONA" as const,
      cost: 3_200_000,
      price: 4_500_000,
    },
    {
      sku: "UPS-800",
      name: "UPS 800VA",
      category: cats[2].id,
      unit: "DONA" as const,
      cost: 480_000,
      price: 720_000,
    },
    {
      sku: "KBL-4x25",
      name: "Kabel 4x25 mm²",
      category: cats[3].id,
      unit: "METR" as const,
      cost: 45_000,
      price: 65_000,
    },
    {
      sku: "AKS-KRP",
      name: "Kirish klemma",
      category: cats[4].id,
      unit: "DONA" as const,
      cost: 15_000,
      price: 25_000,
    },
  ];

  const catalogProducts = [];
  for (const p of products) {
    const cp = await prisma.catalogProduct.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: p.category,
        unitType: p.unit,
        baseCost: p.cost,
        basePrice: p.price,
        warehouseId: mainWh.id,
        lowStockThreshold: 5,
      },
    });
    catalogProducts.push(cp);

    // Create lots
    await prisma.inventoryLot.deleteMany({ where: { catalogProductId: cp.id } });
    await prisma.inventoryLot.create({
      data: {
        catalogProductId: cp.id,
        warehouseId: mainWh.id,
        qty: p.unit === "DONA" ? 15 : 500,
        unitType: p.unit,
        cost: p.cost,
        price: p.price,
        lowStockThreshold: 5,
      },
    });
  }
  console.log(`✅ ${products.length} ta mahsulot + partiya`);

  // ── Accounts ──────────────────────────────────────────────
  const mainKassa = await prisma.account.upsert({
    where: { id: "acc-kassa" },
    update: {},
    create: {
      id: "acc-kassa",
      name: "Asosiy kassa",
      type: "CASH",
      currency: "UZS",
      balanceCache: 12_000_000,
    },
  });
  await prisma.account.upsert({
    where: { id: "acc-bank" },
    update: {},
    create: {
      id: "acc-bank",
      name: "Kapitalbank hisob",
      type: "BANK",
      currency: "UZS",
      balanceCache: 45_000_000,
    },
  });
  await prisma.account.upsert({
    where: { id: "acc-usd" },
    update: {},
    create: {
      id: "acc-usd",
      name: "USD naqd",
      type: "CASH",
      currency: "USD",
      balanceCache: 2500,
    },
  });

  // ── Transaction categories ────────────────────────────────
  const catsIncome = ["Sotuv", "Boshqa daromad"];
  const catsExp = ["Ijara", "Oylik", "Kommunal", "Marketing", "Boshqa xarajat"];
  for (const c of catsIncome)
    await prisma.transactionCategory.upsert({
      where: { name: c },
      update: {},
      create: { name: c, type: "income" },
    });
  for (const c of catsExp)
    await prisma.transactionCategory.upsert({
      where: { name: c },
      update: {},
      create: { name: c, type: "expense" },
    });

  // ── Counterparties ────────────────────────────────────────
  const walkIn = await prisma.counterparty.upsert({
    where: { id: "walk-in" },
    update: {},
    create: {
      id: "walk-in",
      type: "CLIENT",
      name: "Walk-in mijoz",
      clientProfile: { create: { customerKind: "RETAIL" } },
    },
  });

  const clients = [
    { name: "OOO 'Techno Servis'", phone: "+998901234567", kind: "RESELLER" as const },
    { name: "Sanjar Rahmatov", phone: "+998912345678", kind: "RETAIL" as const },
    { name: "OOO 'Elektro Print'", phone: "+998933456789", kind: "RESELLER" as const },
    { name: "Nilufar Karimova", phone: "+998944567890", kind: "RETAIL" as const },
    { name: "Doston Ergashev", phone: "+998955678901", kind: "RETAIL" as const },
  ];
  const clientRecords = [];
  for (const c of clients) {
    const cp = await prisma.counterparty.upsert({
      where: { id: `client-${c.phone}` },
      update: {},
      create: {
        id: `client-${c.phone}`,
        type: "CLIENT",
        name: c.name,
        phone: c.phone,
        clientProfile: {
          create: { customerKind: c.kind, funnel: "LEAD", stage: "new" },
        },
      },
    });
    clientRecords.push(cp);
  }

  const supplier = await prisma.counterparty.upsert({
    where: { id: "sup-china" },
    update: {},
    create: {
      id: "sup-china",
      type: "SUPPLIER",
      name: "Shenzhen Power Ltd.",
      phone: "+86 138 0000 0000",
      supplierProfile: { create: {} },
    },
  });

  // ── Employees ─────────────────────────────────────────────
  const empSanjar = await prisma.counterparty.upsert({
    where: { id: "emp-sanjar" },
    update: {},
    create: {
      id: "emp-sanjar",
      type: "EMPLOYEE",
      name: "Aziz Karimov",
      phone: "+998901111111",
    },
  });
  await prisma.employee.upsert({
    where: { counterpartyId: empSanjar.id },
    update: {},
    create: {
      counterpartyId: empSanjar.id,
      userId: cashier.id,
      position: "Sotuvchi",
      baseSalary: 4_000_000,
      salaryType: "MIXED",
      kpiPercentage: 3,
      startDate: new Date(2025, 5, 15),
    },
  });

  // ── CRM stages ────────────────────────────────────────────
  const leadStages = [
    { key: "new", label: "Yangi", order: 1, color: "#94a3b8" },
    { key: "contacted", label: "Bog'lanildi", order: 2, color: "#0ea5e9" },
    { key: "qualified", label: "Qiziqqan", order: 3, color: "#6366f1" },
    {
      key: "proposal_sent",
      label: "Taklif yuborildi",
      order: 4,
      color: "#8b5cf6",
    },
    {
      key: "won",
      label: "Xaridor bo'ldi",
      order: 5,
      color: "#10b981",
      isTerminal: true,
      triggersOrderCreation: true,
    },
    {
      key: "lost",
      label: "Yo'qotildi",
      order: 6,
      color: "#ef4444",
      isTerminal: true,
      requiresReason: true,
    },
  ];
  for (const s of leadStages) {
    await prisma.crmStageConfig.upsert({
      where: { funnel_stageKey: { funnel: "LEAD", stageKey: s.key } },
      update: {},
      create: {
        funnel: "LEAD",
        stageKey: s.key,
        label: s.label,
        order: s.order,
        color: s.color,
        isTerminal: s.isTerminal ?? false,
        requiresReason: s.requiresReason ?? false,
        triggersOrderCreation: s.triggersOrderCreation ?? false,
      },
    });
  }

  // ── Demo orders ───────────────────────────────────────────
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const client = clientRecords[i % clientRecords.length];
      const product = catalogProducts[i % catalogProducts.length];
      const qty = 1 + (i % 3);
      const total = qty * (product.basePrice ?? 0);
      const paid = i % 3 === 0 ? total : i % 3 === 1 ? total / 2 : 0;
      const statuses = [
        "YANGI_SOROV",
        "MASLAHAT_BERILDI",
        "NARX_KELISHILDI",
        "BUYURTMA_OLINDI",
        "YETKAZILMOQDA",
        "YAKUNLANDI",
      ] as const;
      const createdAt = new Date(now.getTime() - i * 24 * 3600 * 1000);
      await prisma.order.create({
        data: {
          orderNumber: `BZ-DEMO-${1000 + i}`,
          type: "RETAIL",
          status: statuses[i % statuses.length],
          channel: (["INSTAGRAM", "TELEGRAM", "PHONE", "WALK_IN"] as const)[i % 4],
          clientId: client.id,
          clientNameSnapshot: client.name,
          clientPhoneSnapshot: client.phone,
          sellerEmployeeId: empSanjar.id,
          orderCurrency: "UZS",
          agreedAmount: total,
          estimatedAmount: total,
          paidAmount: paid,
          taxRate: 0,
          createdAt,
          items: {
            create: {
              catalogProductId: product.id,
              productNameSnapshot: product.name,
              quantity: qty,
              unitPrice: product.basePrice ?? 0,
            },
          },
        },
      });
    }
    console.log("✅ 8 ta demo buyurtma");
  }

  // ── Settings ──────────────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: "exchange_rate_usd" },
    update: { value: { rate: 12200 } },
    create: { key: "exchange_rate_usd", value: { rate: 12200 } },
  });
  await prisma.setting.upsert({
    where: { key: "company_info" },
    update: {},
    create: {
      key: "company_info",
      value: {
        name: "OneShop MChJ",
        phone: "+998 71 200 00 00",
        address: "Toshkent, O'zbekiston",
      },
    },
  });

  // ── Notifications ─────────────────────────────────────────
  await prisma.notification.create({
    data: {
      type: "SUCCESS",
      title: "Tizim ishga tushdi",
      body: "OneShop ERP muvaffaqiyatli o'rnatildi. admin/admin123 bilan kirishingiz mumkin.",
    },
  });

  console.log("✨ Seed tugadi!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
