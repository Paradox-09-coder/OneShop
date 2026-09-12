import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDateTime } from "@/lib/utils";
import {
  orderTypeLabel,
  paymentTxLabel,
  orderStatusLabel,
  orderChannelLabel,
  paymentTypeLabel,
} from "@/lib/labels";
import { FileText, FlaskConical } from "lucide-react";
import StageStepper from "./stage-stepper";
import LogisticsPanel from "./logistics-panel";
import { computeRecipeRequirements } from "@/lib/production";
import { formatNumber } from "@/lib/utils";
import { unitTypeLabel } from "@/lib/labels";

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
      assignedEmployee: true,
      items: { include: { catalogProduct: true } },
      additionalItems: true,
      payments: { orderBy: { date: "desc" } },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!order) notFound();

  const debt = (order.agreedAmount ?? 0) - order.paidAmount;
  const itemsSubtotal = order.items.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );
  const additionalTotal = order.additionalItems.reduce(
    (s, a) => s + a.totalPrice,
    0
  );
  // Buyurtma yaratishdagi hisoblash tartibi bilan bir xil
  // (src/app/api/orders/route.ts): subtotal -> chegirma -> QQS -> jami.
  const discountAmount =
    order.discountPercent > 0
      ? (itemsSubtotal * order.discountPercent) / 100
      : order.discountAmount;
  const afterDiscount = itemsSubtotal - discountAmount;
  const taxAmount = (afterDiscount * order.taxRate) / 100;

  // Retsept (BOM) bo'yicha xomashyo holati — faqat ishlab chiqarish
  // buyurtmalari uchun.  Advisory ko'rsatuv, hech narsani o'zgartirmaydi
  // (Acham'ning "max producible" hisoblash naqshiga o'xshash).
  const materialReqs =
    order.type === "MANUFACTURING"
      ? await prisma.$transaction((tx) => computeRecipeRequirements(tx, order.id))
      : [];

  return (
    <div>
      <PageHeader
        title={`Buyurtma ${order.orderNumber}`}
        subtitle={formatDateTime(order.createdAt)}
        actions={
          <a
            href={`/api/orders/${order.id}/nakladnoy`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-gray-50 text-sm font-semibold"
            title="Nakladnoy chiqarish (PDF)"
          >
            <FileText size={14} /> Nakladnoy
          </a>
        }
      />

      <StageStepper orderId={order.id} currentStatus={order.status} type={order.type} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="order-2 lg:order-1 space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold mb-3">
              {order.seller ? "Sotuvchi" : "Ma'lumot"}
            </h3>
            {order.seller && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary text-white grid place-items-center font-bold shrink-0">
                  {order.seller.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{order.seller.name}</p>
                  {order.seller.phone && (
                    <p className="text-xs text-ink-soft">{order.seller.phone}</p>
                  )}
                </div>
              </div>
            )}
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Mijoz</dt>
                <dd className="font-semibold text-right">
                  {order.client?.name ?? order.clientNameSnapshot ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Buyurtma ID</dt>
                <dd className="font-mono text-xs">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Turi</dt>
                <dd className="font-semibold">{orderTypeLabel[order.type]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Kanal</dt>
                <dd className="font-semibold">
                  {order.channel ? orderChannelLabel[order.channel] : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">To'lov usuli</dt>
                <dd className="font-semibold">
                  {order.paymentType ? paymentTypeLabel[order.paymentType] : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Menejer</dt>
                <dd className="font-semibold">
                  {order.assignedEmployee?.name ?? "—"}
                </dd>
              </div>
            </dl>
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
              deliveryPaid: !!order.deliveryPaidAt,
            }}
          />
        </div>

        <div className="order-1 lg:order-2 lg:col-span-2 space-y-4">
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

          {materialReqs.length > 0 && (
            <div className="panel p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FlaskConical size={16} className="text-primary" />
                Xomashyo holati (retsept bo'yicha)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-soft uppercase border-b border-border">
                    <th className="text-left py-2">Xomashyo</th>
                    <th className="text-right py-2">Kerak</th>
                    <th className="text-right py-2">Omborda</th>
                    <th className="text-right py-2">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {materialReqs.map((r) => (
                    <tr key={r.materialProductId} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{r.materialName}</td>
                      <td className="py-2.5 text-right">
                        {formatNumber(r.requiredQty)}{" "}
                        {unitTypeLabel[r.unit as keyof typeof unitTypeLabel] ?? r.unit}
                      </td>
                      <td className="py-2.5 text-right text-ink-soft">
                        {formatNumber(r.availableQty)}
                      </td>
                      <td className="py-2.5 text-right">
                        {r.shortage > 0 ? (
                          <span className="chip bg-rose-100 text-rose-700">
                            −{formatNumber(r.shortage)} yetmaydi
                          </span>
                        ) : (
                          <span className="chip bg-emerald-100 text-emerald-700">
                            Yetarli
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.status === "READY" || order.status === "DELIVERED" ? (
                <p className="text-xs text-ink-soft mt-2">
                  Bu buyurtma uchun xomashyo allaqachon ombordan ayirilgan.
                </p>
              ) : (
                <p className="text-xs text-ink-soft mt-2">
                  Xomashyo "Tayyor" bosqichiga o'tganda ombordan avtomatik ayiriladi.
                </p>
              )}
            </div>
          )}

          <div className="panel p-5">
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Mahsulotlar jami</dt>
                <dd className="font-semibold">
                  {formatMoney(itemsSubtotal, order.orderCurrency)}
                </dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">
                    Chegirma{order.discountPercent > 0 ? ` (${order.discountPercent}%)` : ""}
                  </dt>
                  <dd className="font-semibold text-success">
                    − {formatMoney(discountAmount, order.orderCurrency)}
                  </dd>
                </div>
              )}
              {order.taxRate > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">QQS {order.taxRate}%</dt>
                  <dd className="font-semibold">
                    {formatMoney(taxAmount, order.orderCurrency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <dt className="font-bold">Jami</dt>
                <dd className="font-bold">
                  {formatMoney(order.agreedAmount ?? 0, order.orderCurrency)}
                </dd>
              </div>
            </dl>
          </div>

          {materialReqs.length > 0 && (
            <div className="panel p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FlaskConical size={16} className="text-primary" />
                Xomashyo holati (retsept bo'yicha)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-soft uppercase border-b border-border">
                    <th className="text-left py-2">Xomashyo</th>
                    <th className="text-right py-2">Kerak</th>
                    <th className="text-right py-2">Omborda</th>
                    <th className="text-right py-2">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {materialReqs.map((r) => (
                    <tr key={r.materialProductId} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{r.materialName}</td>
                      <td className="py-2.5 text-right">
                        {formatNumber(r.requiredQty)}{" "}
                        {unitTypeLabel[r.unit as keyof typeof unitTypeLabel] ?? r.unit}
                      </td>
                      <td className="py-2.5 text-right text-ink-soft">
                        {formatNumber(r.availableQty)}
                      </td>
                      <td className="py-2.5 text-right">
                        {r.shortage > 0 ? (
                          <span className="chip bg-rose-100 text-rose-700">
                            −{formatNumber(r.shortage)} yetmaydi
                          </span>
                        ) : (
                          <span className="chip bg-emerald-100 text-emerald-700">
                            Yetarli
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.status === "READY" || order.status === "DELIVERED" ? (
                <p className="text-xs text-ink-soft mt-2">
                  Bu buyurtma uchun xomashyo allaqachon ombordan ayirilgan.
                </p>
              ) : (
                <p className="text-xs text-ink-soft mt-2">
                  Xomashyo "Tayyor" bosqichiga o'tganda ombordan avtomatik ayiriladi.
                </p>
              )}
            </div>
          )}

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Qo'shimcha xarajatlar</h3>
            {order.additionalItems.length === 0 ? (
              <p className="text-sm text-ink-soft py-2">
                Qo'shimcha xarajat qo'shilmagan
              </p>
            ) : (
              <div className="space-y-2">
                {order.additionalItems.map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">{a.name}</p>
                      {a.note && <p className="text-xs text-ink-soft">{a.note}</p>}
                    </div>
                    <p className="font-bold whitespace-nowrap">
                      {formatMoney(a.totalPrice, a.currency)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border text-sm">
                  <span className="font-bold">Jami xarajat</span>
                  <span className="font-bold">
                    {formatMoney(additionalTotal, order.orderCurrency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Moliyaviy xulosa</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-ink-soft uppercase font-semibold">To'langan</p>
                <p className="font-bold text-success mt-1">
                  {formatMoney(order.paidAmount, order.orderCurrency)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="text-xs text-ink-soft uppercase font-semibold">Qoldiq</p>
                <p
                  className={`font-bold mt-1 ${debt > 0 ? "text-danger" : "text-success"}`}
                >
                  {formatMoney(debt, order.orderCurrency)}
                </p>
              </div>
            </div>
            {order.exchangeRateSnapshot && (
              <p className="text-xs text-ink-soft mt-3 text-right">
                Kurs: 1 {order.orderCurrency} = {order.exchangeRateSnapshot} UZS
              </p>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Faoliyat tarixi</h3>
            {order.statusHistory.length === 0 ? (
              <p className="text-sm text-ink-soft">Tarix yo'q</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {order.statusHistory.map((h) => (
                  <li key={h.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="chip bg-primary/10 text-primary">
                        {orderStatusLabel[h.toStatus]}
                      </span>
                      <p className="text-xs text-ink-soft mt-1">
                        {formatDateTime(h.changedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
