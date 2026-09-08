import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import PosClient from "./client";

export default async function PosPage() {
  const [products, walkIn, accounts] = await Promise.all([
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
    prisma.counterparty.findFirst({
      where: { name: "Walk-in mijoz", type: "CLIENT" },
    }),
    prisma.account.findMany({
      where: { isActive: true, type: "CASH" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Kassa (POS)" subtitle="Do'kondan tez sotuv" />
      <PosClient
        products={products}
        walkInId={walkIn?.id ?? null}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
