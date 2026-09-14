import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import NewOrderForm from "./form";

export const dynamic = "force-dynamic";

async function loadExchangeRate(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: "exchange_rate_usd" } });
  const v = s?.value as { rate?: number } | null;
  return v?.rate ?? Number(process.env.DEFAULT_EXCHANGE_RATE ?? 12200);
}

export default async function NewOrderPage() {
  const [clients, catalog, categories, recipes, rate, accounts, driverEmployees] = await Promise.all([
    prisma.counterparty.findMany({
      where: { type: "CLIENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
      take: 500,
    }),
    prisma.catalogProduct.findMany({
      // Faqat mijozga sotiladigan mahsulotlar — xomashyo (bitum, folga,
      // steklaxolst, mel...) bu yerda ko'rinmasligi kerak, ular faqat
      // Retsept (BOM) ingredienti sifatida ishlatiladi.
      where: { status: "active", isSellable: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        basePriceCurrency: true,
        unitType: true,
        categoryId: true,
      },
      take: 1000,
    }),
    prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    // Bir mahsulotda bir nechta faol retsept (masalan arzonroq/qimmatroq
    // formula) bo'lsa — buyurtma qatorida foydalanuvchi tanlaydi
    // (meeting 20:53-21:36: "zakazga qarab... mijoz qimmatroq olaman
    // desa, o'shanga qarab qilib beramiz").
    prisma.recipe.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, catalogProductId: true, variantName: true },
    }),
    loadExchangeRate(),
    prisma.account.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
    prisma.employee.findMany({
      where: { position: "Haydovchi" },
      include: { counterparty: { select: { name: true, phone: true } } },
      orderBy: { counterparty: { name: "asc" } },
    }),
  ]);

  const drivers = driverEmployees.map((e) => ({
    id: e.counterpartyId,
    name: e.counterparty.name,
    phone: e.counterparty.phone,
    carNumber: e.carNumber,
  }));

  const recipesByProduct: Record<string, { id: string; variantName: string }[]> = {};
  for (const r of recipes) {
    (recipesByProduct[r.catalogProductId] ??= []).push({
      id: r.id,
      variantName: r.variantName,
    });
  }

  return (
    <div>
      <PageHeader title="Yangi buyurtma" subtitle="Buyurtmani yaratish" />
      <NewOrderForm
        clients={clients}
        catalog={catalog}
        categories={categories}
        recipesByProduct={recipesByProduct}
        defaultExchangeRate={rate}
        accounts={accounts}
        drivers={drivers}
      />
    </div>
  );
}
