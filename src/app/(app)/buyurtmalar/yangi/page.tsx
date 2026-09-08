import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import NewOrderForm from "./form";

export default async function NewOrderPage() {
  const [clients, catalog] = await Promise.all([
    prisma.counterparty.findMany({
      where: { type: "CLIENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
      take: 200,
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
      take: 500,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Yangi buyurtma" subtitle="Buyurtmani yaratish" />
      <NewOrderForm clients={clients} catalog={catalog} />
    </div>
  );
}
