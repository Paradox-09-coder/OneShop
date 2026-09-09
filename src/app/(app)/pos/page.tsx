import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import PosClient from "./client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [products, walkIn, accounts, categories, recentOrders] = await Promise.all([
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
        categoryId: true,
      },
      take: 5000,
    }),
    prisma.counterparty.findFirst({
      where: { name: "Walk-in mijoz", type: "CLIENT" },
    }),
    prisma.account.findMany({
      where: { isActive: true, type: "CASH" },
    }),
    prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.order.findMany({
      where: { type: "POS", status: "YAKUNLANDI" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Kassa (POS)" subtitle="Do'kondan tez sotuv" />
      <PosClient
        products={products}
        categories={categories}
        walkInId={walkIn?.id ?? null}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
        recentOrders={recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          clientName: o.client?.name ?? o.clientNameSnapshot ?? "Walk-in",
          amount: o.agreedAmount ?? 0,
          currency: o.orderCurrency,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
