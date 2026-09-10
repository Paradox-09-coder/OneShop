import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDateTime } from "@/lib/utils";
import {
  orderStatusLabel,
  orderStatusColor,
  orderTypeLabel,
  paymentTxLabel,
} from "@/lib/labels";
import { FileText, Truck } from "lucide-react";
import TransitionButton from "./transition-button";
import LogisticsPanel from "./logistics-panel";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      seller: true,
      items: { include: { catalogProduct: true } },
      additionalItems: true,
      payments: { orderBy: { date: "desc" } },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!order) notFound();

  const debt = (order.agreedAmount ?? 0) - order.paidAmount;

  return (
    <div>
      <PageHeader
        title={`Buyurtma ${order.orderNumber}`}
        subtitle={formatDateTime(order.createdAt)}
        actions={
          <div className="flex gap-2 items-center">
            <a
              href={`/api/orders/${order.id}/nakladnoy`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-gray-50 text-sm font-semibold"
              title="Nakladnoy chiqarish (PDF)"
            >
              <FileText size={14} /> Nakladnoy
            </a>
            <span className={`chip ${orderStatusColor[order.status]}`}>
              {orderStatusLabel[order.status]}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold mb-3">Mahsulotlar</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border">
                  <th className="text-left py-2">Nomi</th>
                  <th className="text-right py-2">Miqdor</th>
                  <th className="text-right py-2">Narx</th>
                  <th className="text-right py-2">Summa</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/50">
                    <td className="py-2.5 font-medium">
                      {it.productNameSnapshot}
                    </td>
                    <td className="py-2.5 text-right">
                      {it.quantity} {it.unitType.toLowerCase()}
                    </td>
                    <td className="py-2.5 text-right">
                      {formatMoney(it.unitPrice, it.currency)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatMoney(it.quantity * it.unitPrice, it.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">To'lovlar</h3>
            {order.payments.length === 0 ? (
              <p className="text-sm text-ink-soft py-4 text-center">
                To'lovlar yo'q
              </p>
            ) : (
              <div className="space-y-2">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {paymentTxLabel[p.type]}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {formatDateTime(p.date)}
                      </p>
                    </div>
                    <p className="font-bold">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Holat tarixi</h3>
            {order.statusHistory.length === 0 ? (
              <p className="text-sm text-ink-soft">Tarix yo'q</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.statusHistory.map((h) => (
                  <li
                    key={h.id}
                    className="flex justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <span>
                      {h.fromStatus
                        ? `${orderStatusLabel[h.fromStatus]} → ${orderStatusLabel[h.toStatus]}`
                        : orderStatusLabel[h.toStatus]}
                    </span>
                    <span className="text-ink-soft">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold mb-3">Buyurtma</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Turi</dt>
                <dd className="font-semibold">{orderTypeLabel[order.type]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Valyuta</dt>
                <dd className="font-semibold">{order.orderCurrency}</dd>
              </div>
              {order.exchangeRateSnapshot && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Kurs</dt>
                  <dd>{order.exchangeRateSnapshot}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">QQS</dt>
                <dd>{order.taxRate}%</dd>
              </div>
            </dl>
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Mijoz</h3>
            {order.client ? (
              <>
                <p className="font-semibold">{order.client.name}</p>
                {order.client.phone && (
                  <p className="text-sm text-ink-soft">{order.client.phone}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-soft">Mijoz biriktirilmagan</p>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Yakuniy hisob</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Jami</span>
                <span className="font-semibold">
                  {formatMoney(order.agreedAmount ?? 0, order.orderCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">To'landi</span>
                <span className="font-semibold text-success">
                  {formatMoney(order.paidAmount, order.orderCurrency)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-bold">Qarz</span>
                <span
                  className={
                    debt > 0 ? "font-bold text-danger" : "font-bold text-success"
                  }
                >
                  {formatMoney(debt, order.orderCurrency)}
                </span>
              </div>
            </div>
          </div>

          <TransitionButton
            orderId={order.id}
            currentStatus={order.status}
            type={order.type}
          />

          <LogisticsPanel
            orderId={order.id}
            initial={{
              driverName: order.driverName ?? "",
              driverPhone: order.driverPhone ?? "",
              driverCarNumber: order.driverCarNumber ?? "",
              deliveryCost: order.deliveryCost ?? 0,
              deliveryAddress: order.deliveryAddress ?? "",
              receiverName: order.receiverName ?? "",
              receiverPhone: order.receiverPhone ?? "",
              expectedDeliveryDate: order.expectedDeliveryDate
                ? order.expectedDeliveryDate.toISOString().slice(0, 10)
                : "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
