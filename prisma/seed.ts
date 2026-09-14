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

  // ── Demo foydalanuvchilar — meetingdagi 5 rol bo'yicha ────
  const demoUsers = [
    {
      username: "rahbar",
      name: "Bahodir aka (rahbar)",
      password: "rahbar123",
      role: "RAHBAR" as const,
    },
    {
      username: "sotuvchi",
      name: "Sanjar (sotuvchi)",
      password: "sotuvchi123",
      role: "SOTUVCHI" as const,
    },
    {
      username: "alisher",
      name: "Alisher aka (sex mudiri)",
      password: "alisher123",
      role: "SEX_MUDIRI" as const,
    },
    {
      username: "omborchi",
      name: "Umid (omborchi)",
      password: "omborchi123",
      role: "OMBORCHI" as const,
    },
    {
      username: "buxgalter",
      name: "Nilufar opa (buxgalter)",
      password: "buxgalter123",
      role: "BUXGALTER" as const,
    },
  ];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { role: u.role, name: u.name },
      create: {
        username: u.username,
        name: u.name,
        password: hash,
        role: u.role,
      },
    });
  }
  console.log(`✅ ${demoUsers.length} ta demo foydalanuvchi (rollar)`);

  // ── Warehouse ─────────────────────────────────────────────
  const mainWh = await prisma.warehouse.upsert({
    where: { name: "Asosiy ombor" },
    update: {},
    create: { name: "Asosiy ombor", address: "Toshkent, Chilonzor" },
  });

  // ── Product categories ────────────────────────────────────
  const cats = await Promise.all(
    ["Polizol (tayyor)", "Bitum va folga", "Steklaxolst", "Mel va boshqa", "Chelakli mastika"].map(
      (name, i) =>
        prisma.productCategory.upsert({
          where: { id: `cat-${i}` },
          update: { name },
          create: { id: `cat-${i}`, name, sortOrder: i },
        })
    )
  );

  // ── Catalog products ──────────────────────────────────────
  // Polizol domain — rulon shaklidagi izolyator + xomashyo
  //
  // isSellable: true  → mijozga sotiladi, "Yangi buyurtma" / "Kassa"
  //                      mahsulot ro'yxatida ko'rinadi
  // isSellable: false → faqat xomashyo, Retsept (BOM) ingredient
  //                      sifatida tanlanadi, sotuv ro'yxatida YO'Q
  const products = [
    // Tayyor mahsulotlar (sotiladigan)
    {
      sku: "POL-33-STD",
      name: "Polizol 33kg (uchlik, standart)",
      category: cats[0].id,
      unit: "DONA" as const,
      cost: 145_000,
      price: 195_000,
      isSellable: true,
    },
    {
      sku: "POL-33-FOL",
      name: "Polizol 33kg (uchlik, folgali)",
      category: cats[0].id,
      unit: "DONA" as const,
      cost: 175_000,
      price: 245_000,
      isSellable: true,
    },
    {
      sku: "POL-22-STD",
      name: "Polizol 22kg (folgasiz)",
      category: cats[0].id,
      unit: "DONA" as const,
      cost: 110_000,
      price: 155_000,
      isSellable: true,
    },
    // Xomashyo (faqat retseptda ishlatiladi — sotilmaydi)
    {
      sku: "BITUM-90",
      name: "Bitum 90/40 (Buxoro)",
      category: cats[1].id,
      unit: "KG" as const,
      cost: 1_800,
      price: 0,
      isSellable: false,
    },
    {
      sku: "FOLGA-30",
      name: "Alyuminiy folga 30 mkm",
      category: cats[1].id,
      unit: "M2" as const,
      cost: 12_000,
      price: 0,
      isSellable: false,
    },
    // Steklaxolst
    {
      sku: "STEKLO-100",
      name: "Steklaxolst 100 g/m²",
      category: cats[2].id,
      unit: "M2" as const,
      cost: 5_400,
      price: 0,
      isSellable: false,
    },
    // Mel
    {
      sku: "MEL-1",
      name: "Mel (bo'r)",
      category: cats[3].id,
      unit: "KG" as const,
      cost: 950,
      price: 0,
      isSellable: false,
    },
  ];

  const catalogProducts = [];
  for (const p of products) {
    const cp = await prisma.catalogProduct.upsert({
      where: { sku: p.sku },
      update: { isSellable: p.isSellable },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: p.category,
        unitType: p.unit,
        baseCost: p.cost,
        basePrice: p.price,
        warehouseId: mainWh.id,
        lowStockThreshold: 5,
        isSellable: p.isSellable,
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

  // Eski demo mahsulotlarni (Generator/Stabilizator/UPS/Kabel...) yashirish —
  // bular Polizol biznesiga aloqasi yo'q, avvalgi umumiy demo'dan qolgan.
  // O'chirmaymiz (eski buyurtmalar ularga bog'liq bo'lishi mumkin), faqat
  // "inactive" qilib sotuv ro'yxatidan chiqaramiz.
  const currentSkus = products.map((p) => p.sku);
  const hidden = await prisma.catalogProduct.updateMany({
    where: { sku: { notIn: currentSkus }, status: "active" },
    data: { status: "inactive", isSellable: false },
  });
  if (hidden.count > 0) {
    console.log(`✅ ${hidden.count} ta eski demo mahsulot yashirildi`);
  }

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
    const safeId = "client-" + c.phone.replace(/[^\d]/g, "");
    const cp = await prisma.counterparty.upsert({
      where: { id: safeId },
      update: {},
      create: {
        id: safeId,
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

  const _supplier = await prisma.counterparty.upsert({
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
  void _supplier;

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

  // ── Additional counterparties ─────────────────────────────
  // Second supplier + driver + more clients — for richer demo
  const supplier2 = await prisma.counterparty.upsert({
    where: { id: "sup-local" },
    update: {},
    create: {
      id: "sup-local",
      type: "SUPPLIER",
      name: "OOO 'Toshkent Kabel'",
      phone: "+998712001122",
      supplierProfile: { create: {} },
    },
  });

  const driver = await prisma.counterparty.upsert({
    where: { id: "drv-1" },
    update: {},
    create: {
      id: "drv-1",
      type: "OTHER",
      name: "Otabek (haydovchi)",
      phone: "+998907778899",
    },
  });

  // ── Transaction categories ────────────────────────────────
  const catIn = ["Sotuv", "Boshqa daromad", "Investitsiya"];
  const catOut = ["Ijara", "Oylik", "Kommunal", "Marketing", "Sotib olish", "Boshqa xarajat"];
  const txCategoryMap: Record<string, string> = {};
  for (const n of catIn) {
    const c = await prisma.transactionCategory.upsert({
      where: { name: n },
      update: {},
      create: { name: n, type: "income" },
    });
    txCategoryMap[n] = c.id;
  }
  for (const n of catOut) {
    const c = await prisma.transactionCategory.upsert({
      where: { name: n },
      update: {},
      create: { name: n, type: "expense" },
    });
    txCategoryMap[n] = c.id;
  }

  // ── Demo payments — 60 kunlik moliya tarixi ────────────────
  const paymentsCount = await prisma.payment.count();
  if (paymentsCount === 0) {
    const kassaId = "acc-kassa";
    const bankId = "acc-bank";
    const now = Date.now();
    const day = 86400_000;
    const allClients = clientRecords;
    const allOrders = await prisma.order.findMany({ take: 8 });

    // Income (client payments) across last 60 days
    for (let i = 0; i < 30; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const client = allClients[i % allClients.length];
      const order = allOrders[i % allOrders.length];
      const amount = 500_000 + Math.floor(Math.random() * 5_000_000);
      const useBank = i % 3 === 0;
      await prisma.payment.create({
        data: {
          date: new Date(now - daysAgo * day),
          type: useBank ? "BANK_IN" : "CASH_IN",
          accountId: useBank ? bankId : kassaId,
          counterpartyId: client.id,
          counterpartyNameSnapshot: client.name,
          amount,
          currency: "UZS",
          categoryId: txCategoryMap["Sotuv"],
          orderId: order?.id ?? null,
          sourceType: "ORDER",
          sourceId: order?.id ?? null,
          sourceLabel: order?.orderNumber,
          description: `To'lov — ${client.name}`,
        },
      });
    }
    // Expenses — rent, salary, marketing
    const expenseTemplates = [
      { name: "Ijara (do'kon)", cat: "Ijara", amount: 4_500_000, freq: 30 },
      { name: "Marketing kampaniyasi", cat: "Marketing", amount: 800_000, freq: 15 },
      { name: "Kommunal to'lovlar", cat: "Kommunal", amount: 350_000, freq: 30 },
      { name: "Sotib olish (kabel)", cat: "Sotib olish", amount: 2_500_000, freq: 20 },
    ];
    for (const e of expenseTemplates) {
      for (let day2 = 0; day2 < 60; day2 += e.freq) {
        await prisma.payment.create({
          data: {
            date: new Date(now - day2 * day),
            type: "CASH_OUT",
            accountId: kassaId,
            amount: e.amount + Math.floor(Math.random() * 500_000),
            currency: "UZS",
            categoryId: txCategoryMap[e.cat],
            sourceType: "EXPENSE",
            description: e.name,
          },
        });
      }
    }
    console.log("✅ Moliya tarixi (60 kun)");
  }

  // ── Payroll accrual (last month) ───────────────────────────
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const period = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  await prisma.payrollAccrual.upsert({
    where: { employeeId_period: { employeeId: empSanjar.id, period } },
    update: {},
    create: {
      employeeId: empSanjar.id,
      period,
      amount: 4_000_000,
      note: "Oylik + KPI",
    },
  });

  // ── Notifications ─────────────────────────────────────────
  const notifCount = await prisma.notification.count();
  if (notifCount <= 1) {
    await prisma.notification.createMany({
      data: [
        {
          type: "SUCCESS",
          title: "Yangi buyurtma yaratildi",
          body: "BZ-DEMO-1000 — 5 200 000 so'm",
          link: "/buyurtmalar",
        },
        {
          type: "WARNING",
          title: "Kam qoldiq",
          body: "Stabilizator 5000VA ombordan tugab qolyapti",
          link: "/omborxona?filter=low-stock",
        },
        {
          type: "DANGER",
          title: "Muddati o'tgan to'lov",
          body: "BZ-DEMO-1001 uchun 15-oy to'lovi vaqti o'tdi",
          link: "/moliya/qarzdorliklar",
        },
        {
          type: "INFO",
          title: "Yangi mijoz",
          body: "OOO 'Techno Servis' CRM'ga qo'shildi",
          link: "/mijozlar",
        },
      ],
    });
    console.log("✅ 4 ta bildirishnoma");
  }

  // ── Client note ────────────────────────────────────────────
  const noteCount = await prisma.counterpartyNote.count();
  if (noteCount === 0 && clientRecords[0]) {
    await prisma.counterpartyNote.create({
      data: {
        counterpartyId: clientRecords[0].id,
        text: "VIP mijoz — har oy 20-sanada to'laydi.",
      },
    });
  }

  // ── Retsept (BOM) — Polizol 33 kg (uchlik) uchun ─────────
  const recipeCount = await prisma.recipe.count();
  if (recipeCount === 0) {
    const polizol33std = catalogProducts.find((p) => p.sku === "POL-33-STD");
    const polizol33fol = catalogProducts.find((p) => p.sku === "POL-33-FOL");
    const bitum = catalogProducts.find((p) => p.sku === "BITUM-90");
    const folga = catalogProducts.find((p) => p.sku === "FOLGA-30");
    const steklo = catalogProducts.find((p) => p.sku === "STEKLO-100");
    const mel = catalogProducts.find((p) => p.sku === "MEL-1");

    if (polizol33std && bitum && steklo && mel) {
      const recipe = await prisma.recipe.create({
        data: {
          catalogProductId: polizol33std.id,
          variantName: "Standart",
          outputQty: 1,
          outputUnit: "DONA",
          laborCost: 3000,     // 3000 so'm/dona (сдельный)
          note: "1 rulon polizol 33 kg uchun retsept (standart)",
        },
      });
      await prisma.recipeIngredient.createMany({
        data: [
          { recipeId: recipe.id, materialProductId: bitum.id, quantity: 26, unit: "KG", wastePercent: 2 },
          { recipeId: recipe.id, materialProductId: steklo.id, quantity: 4, unit: "M2", wastePercent: 3 },
          { recipeId: recipe.id, materialProductId: mel.id, quantity: 3, unit: "KG", wastePercent: 1 },
        ],
      });
    }

    if (polizol33fol && bitum && folga && steklo && mel) {
      const recipe = await prisma.recipe.create({
        data: {
          catalogProductId: polizol33fol.id,
          variantName: "Folgali",
          outputQty: 1,
          outputUnit: "DONA",
          laborCost: 3500,
          note: "1 rulon polizol 33 kg (folgali) uchun retsept",
        },
      });
      await prisma.recipeIngredient.createMany({
        data: [
          { recipeId: recipe.id, materialProductId: bitum.id, quantity: 25, unit: "KG", wastePercent: 2 },
          { recipeId: recipe.id, materialProductId: folga.id, quantity: 4, unit: "M2", wastePercent: 5 },
          { recipeId: recipe.id, materialProductId: steklo.id, quantity: 4, unit: "M2", wastePercent: 3 },
          { recipeId: recipe.id, materialProductId: mel.id, quantity: 3, unit: "KG", wastePercent: 1 },
        ],
      });
    }
    console.log("✅ 2 ta retsept (BOM)");
  }

  // ── Credit limits — bir necha mijoz uchun ─────────────────
  const client0 = clientRecords[0];
  const client1 = clientRecords[1];
  if (client0) {
    await prisma.clientProfile.update({
      where: { counterpartyId: client0.id },
      data: {
        creditLimit: 100_000_000,
        creditLimitCurrency: "UZS",
        creditLimitEnabled: true,
      },
    });
  }
  if (client1) {
    await prisma.clientProfile.update({
      where: { counterpartyId: client1.id },
      data: {
        creditLimit: 20_000_000,
        creditLimitCurrency: "UZS",
        creditLimitEnabled: true,
      },
    });
  }

  // ── Demo konteynerlar (shipments) — xomashyo kirimi ────────
  const shipmentCount = await prisma.shipment.count();
  if (shipmentCount === 0) {
    const bitum = catalogProducts.find((p) => p.sku === "BITUM-90");
    const folga = catalogProducts.find((p) => p.sku === "FOLGA-30");
    const steklo = catalogProducts.find((p) => p.sku === "STEKLO-100");
    const mel = catalogProducts.find((p) => p.sku === "MEL-1");

    // Konteyner 1 — Bitum (Turkmaniston, USD)
    if (bitum) {
      const s1 = await prisma.shipment.create({
        data: {
          supplierId: _supplier.id,
          containerNumber: "KZ-3341/2026",
          status: "COMPLETED",
          shippingDate: new Date(Date.now() - 25 * 86400_000),
          arrivalDate: new Date(Date.now() - 20 * 86400_000),
          currency: "USD",
          totalProductCost: 15_400,
          totalExpenses: 850,
          totalCost: 16_250,
          note: "Turkmaniston, Buxoro orqali, 11 tonna",
        },
      });
      await prisma.shipmentItem.create({
        data: {
          shipmentId: s1.id,
          catalogProductId: bitum.id,
          productNameSnapshot: bitum.name,
          quantity: 11_000, // kg
          unitPrice: 1.4,   // USD/kg
          totalPrice: 15_400,
          currency: "USD",
          transferredToInventory: true,
        },
      });
      await prisma.shipmentExpense.createMany({
        data: [
          {
            shipmentId: s1.id,
            expenseType: "customs",
            amount: 450,
            currency: "USD",
            note: "Bojxona",
          },
          {
            shipmentId: s1.id,
            expenseType: "transport",
            amount: 300,
            currency: "USD",
            note: "Buxoro → Toshkent yo'l kira",
          },
          {
            shipmentId: s1.id,
            expenseType: "unloading",
            amount: 100,
            currency: "USD",
            note: "Sexga tushirish",
          },
        ],
      });
    }

    // Konteyner 2 — Steklaxolst (Xitoy, USD)
    if (steklo) {
      const s2 = await prisma.shipment.create({
        data: {
          supplierId: supplier2.id,
          containerNumber: "CN-5518/2026",
          status: "ARRIVED",
          shippingDate: new Date(Date.now() - 12 * 86400_000),
          arrivalDate: new Date(Date.now() - 3 * 86400_000),
          currency: "USD",
          totalProductCost: 4_320,
          totalExpenses: 380,
          totalCost: 4_700,
          note: "Xitoy, 24 ta rulon 100 g/m² steklaxolst",
        },
      });
      await prisma.shipmentItem.create({
        data: {
          shipmentId: s2.id,
          catalogProductId: steklo.id,
          productNameSnapshot: steklo.name,
          quantity: 800,  // m²
          unitPrice: 5.4,
          totalPrice: 4_320,
          currency: "USD",
          transferredToInventory: true,
        },
      });
      await prisma.shipmentExpense.createMany({
        data: [
          {
            shipmentId: s2.id,
            expenseType: "customs",
            amount: 220,
            currency: "USD",
            note: "Bojxona",
          },
          {
            shipmentId: s2.id,
            expenseType: "transport",
            amount: 160,
            currency: "USD",
            note: "Yo'l kira",
          },
        ],
      });
    }

    // Konteyner 3 — Folga (Xitoy, USD) — hali yo'lda
    if (folga) {
      const s3 = await prisma.shipment.create({
        data: {
          supplierId: supplier2.id,
          containerNumber: "CN-5622/2026",
          status: "IN_TRANSIT",
          shippingDate: new Date(Date.now() - 5 * 86400_000),
          currency: "USD",
          totalProductCost: 6_000,
          totalExpenses: 0,
          totalCost: 6_000,
          note: "Xitoy → Toshkent, 30 mkm folga, yo'lda",
        },
      });
      await prisma.shipmentItem.create({
        data: {
          shipmentId: s3.id,
          catalogProductId: folga.id,
          productNameSnapshot: folga.name,
          quantity: 500,   // m²
          unitPrice: 12,   // USD/m²
          totalPrice: 6_000,
          currency: "USD",
          transferredToInventory: false, // hali yo'lda, ombor'ga yozilmagan
        },
      });
    }

    // Konteyner 4 — Mel (mahalliy, so'm)
    if (mel) {
      const s4 = await prisma.shipment.create({
        data: {
          supplierId: supplier2.id,
          containerNumber: "LOC-0912/26",
          status: "COMPLETED",
          shippingDate: new Date(Date.now() - 8 * 86400_000),
          arrivalDate: new Date(Date.now() - 8 * 86400_000),
          currency: "UZS",
          totalProductCost: 2_850_000,
          totalExpenses: 150_000,
          totalCost: 3_000_000,
          note: "Mahalliy mel, 3 tonna",
        },
      });
      await prisma.shipmentItem.create({
        data: {
          shipmentId: s4.id,
          catalogProductId: mel.id,
          productNameSnapshot: mel.name,
          quantity: 3_000,
          unitPrice: 950,
          totalPrice: 2_850_000,
          currency: "UZS",
          transferredToInventory: true,
        },
      });
      await prisma.shipmentExpense.create({
        data: {
          shipmentId: s4.id,
          expenseType: "transport",
          amount: 150_000,
          currency: "UZS",
          note: "Mahalliy yo'l kira",
        },
      });
    }
    console.log("✅ 4 ta demo konteyner + xarajatlar");
  }

  // ── Buyer funnel CRM stages ────────────────────────────────
  const buyerStages = [
    { key: "active", label: "Faol xaridor", order: 1, color: "#10b981" },
    { key: "vip", label: "VIP mijoz", order: 2, color: "#f59e0b" },
    { key: "resale_needed", label: "Qayta sotuvni kutmoqda", order: 3, color: "#8b5cf6", requiresResaleDate: true },
    { key: "inactive", label: "Faol emas", order: 4, color: "#94a3b8" },
  ];
  for (const s of buyerStages) {
    await prisma.crmStageConfig.upsert({
      where: { funnel_stageKey: { funnel: "BUYER", stageKey: s.key } },
      update: {},
      create: {
        funnel: "BUYER",
        stageKey: s.key,
        label: s.label,
        order: s.order,
        color: s.color,
        requiresResaleDate: s.requiresResaleDate ?? false,
      },
    });
  }

  // ── Ensure suppressed warning: refer to unused vars ──────
  void supplier2;
  void driver;

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
