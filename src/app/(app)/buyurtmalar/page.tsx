import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  orderStatusLabel,
  orderStatusColor,
  orderTypeLabel,
  orderPriorityLabel,
} from "@/lib/labels";
import { Plus, ShoppingCart } from "lucide-react";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { client: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        subtitle="Barcha buyurtmalar ro'yxati"
        actions={
          <Link
            href="/buyurtmalar/yangi"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
          >
            <Plus size={16} /> Yangi buyurtma
          </Link>
        }
      />

      <div className="panel overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState
            title="Hozircha buyurtmalar yo'q"
            message="Birinchi buyurtmani yaratish uchun yuqoridagi tugmani bosing"
            icon={<ShoppingCart size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Raqami</th>
                  <th className="text-left px-5 py-3">Sana</th>
                  <th className="text-left px-5 py-3">Mijoz</th>
                  <th className="text-left px-5 py-3">Turi</th>
                  <th className="text-left px-5 py-3">Holat</th>
                  <th className="text-left px-5 py-3">Ustuvorlik</th>
                  <th className="text-right px-5 py-3">Summa</th>
                  <th className="text-right px-5 py-3">To'landi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const debt = (o.agreedAmount ?? 0) - o.paidAmount;
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-border/50 hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/buyurtmalar/${o.id}`}
                          className="font-semibold text-primary"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {o.client?.name ?? o.clientNameSnapshot ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">
                        {orderTypeLabel[o.type]}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`chip ${orderStatusColor[o.status]}`}>
                          {orderStatusLabel[o.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {o.priority !== "NORMAL" && (
                          <span
                            className={
                              o.priority === "VIP"
                                ? "chip bg-fuchsia-100 text-fuchsia-700"
                                : "chip bg-amber-100 text-amber-700"
                            }
                          >
                            {orderPriorityLabel[o.priority]}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatMoney(o.agreedAmount ?? 0, o.orderCurrency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {debt > 0 ? (
                          <span className="text-danger font-semibold">
                            {formatMoney(o.paidAmount, o.orderCurrency)}
                          </span>
                        ) : (
                          <span className="text-success font-semibold">
                            {formatMoney(o.paidAmount, o.orderCurrency)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
