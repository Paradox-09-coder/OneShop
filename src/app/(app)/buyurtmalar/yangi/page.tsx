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
  const [clients, catalog, rate] = await Promise.all([
    prisma.counterparty.findMany({
      where: { type: "CLIENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
      take: 500,
    }),
    prisma.catalogProduct.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        basePriceCurrency: true,
        unitType: true,
      },
      take: 1000,
    }),
    loadExchangeRate(),
  ]);

  return (
    <div>
      <PageHeader title="Yangi buyurtma" subtitle="Buyurtmani yaratish" />
      <NewOrderForm clients={clients} catalog={catalog} defaultExchangeRate={rate} />
    </div>
  );
}
