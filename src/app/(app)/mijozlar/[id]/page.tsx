import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils";
import {
  customerKindLabel,
  orderStatusLabel,
  orderStatusColor,
  paymentTxLabel,
} from "@/lib/labels";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  Star,
  ShoppingCart,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import CreditLimitPanel from "./credit-limit-panel";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = await params;
  const id = decodeURIComponent(raw.id);
  const client = await prisma.counterparty.findUnique({
    where: { id },
    include: {
      clientProfile: true,
      counterpartyNotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      extraExpenses: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });
  if (!client || client.type !== "CLIENT") notFound();

  const [orders, payments, ordersAggregate] = await Promise.all([
    prisma.order.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payment.findMany({
      where: { counterpartyId: id, voidedAt: null },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.order.aggregate({
      where: { clientId: id, status: { not: "CANCELLED" } },
      _sum: { agreedAmount: true, paidAmount: true },
      _count: true,
    }),
  ]);

  const totalOrdered = ordersAggregate._sum.agreedAmount ?? 0;
  const totalPaid = ordersAggregate._sum.paidAmount ?? 0;
  const debt = totalOrdered - totalPaid;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/mijozlar"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary"
        >
          <ArrowLeft size={14} /> Mijozlar
        </Link>
      </div>

      <PageHeader
        title={client.name}
        subtitle={
          client.clientProfile
            ? customerKindLabel[client.clientProfile.customerKind]
            : "Mijoz"
        }
        actions={
          <div className="flex items-center gap-2">
            <div
              className={`chip py-1.5 px-4 ${
                debt > 0
                  ? "bg-danger-light/40 text-danger"
                  : "bg-success/20 text-success"
              }`}
            >
              <span className="text-xs font-normal">Qarz:</span>
              <span className="font-bold ml-1">
                {formatMoney(debt, client.balanceCurrency)}
              </span>
            </div>
            <Link
              href={`/buyurtmalar/yangi?client=${client.id}`}
              className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark"
            >
              + Yangi buyurtma
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold mb-3">Kontakt</h3>
            <dl className="space-y-2 text-sm">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-ink-soft" />
                  <a
                    href={`tel:${client.phone}`}
                    className="font-semibold text-primary"
                  >
                    {client.phone}
                  </a>
                </div>
              )}
              {client.phone2 && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-ink-soft" />
                  <span>{client.phone2}</span>
                </div>
              )}
              {client.telegram && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-ink-soft" />
                  <span>{client.telegram}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <span className="text-ink-soft w-4">@</span>
                  <span>{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-ink-soft mt-0.5" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.inn && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-ink-soft" />
                  <span>INN: {client.inn}</span>
                </div>
              )}
              {client.clientProfile?.rating && (
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-warning" />
                  <span>Reyting: {client.clientProfile.rating}/5</span>
                </div>
              )}
            </dl>
          </div>

          <CreditLimitPanel
            clientId={client.id}
            initial={{
              creditLimit: client.clientProfile?.creditLimit ?? 0,
              creditLimitCurrency: client.clientProfile?.creditLimitCurrency ?? "UZS",
              creditLimitEnabled: client.clientProfile?.creditLimitEnabled ?? false,
            }}
            currentDebt={debt}
          />

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Statistika</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Buyurtmalar</dt>
                <dd className="font-semibold">{ordersAggregate._count} ta</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Umumiy summa</dt>
                <dd className="font-semibold">
                  {formatMoney(totalOrdered, client.balanceCurrency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">To'landi</dt>
                <dd className="font-semibold text-success">
                  {formatMoney(totalPaid, client.balanceCurrency)}
                </dd>
              </div>
              <div className="pt-2 border-t border-border flex justify-between">
                <dt className="font-bold">Qarz</dt>
                <dd
                  className={`font-bold ${
                    debt > 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {formatMoney(debt, client.balanceCurrency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Qo'shildi</dt>
                <dd>{formatDate(client.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary" />
              <h3 className="font-bold">Buyurtmalar ({orders.length})</h3>
            </div>
            {orders.length === 0 ? (
              <p className="p-6 text-center text-ink-soft text-sm">
                Buyurtmalar yo'q
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                      <th className="text-left px-5 py-2">Raqami</th>
                      <th className="text-left px-5 py-2">Sana</th>
                      <th className="text-left px-5 py-2">Holat</th>
                      <th className="text-right px-5 py-2">Summa</th>
                      <th className="text-right px-5 py-2">Qarz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const d = (o.agreedAmount ?? 0) - o.paidAmount;
                      return (
                        <tr key={o.id} className="border-b border-border/50">
                          <td className="px-5 py-2">
                            <Link
                              href={`/buyurtmalar/${o.id}`}
                              className="font-semibold text-primary"
                            >
                              {o.orderNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-2 text-ink-soft">
                            {formatDate(o.createdAt)}
                          </td>
                          <td className="px-5 py-2">
                            <span className={`chip ${orderStatusColor[o.status]}`}>
                              {orderStatusLabel[o.status]}
                            </span>
                          </td>
                          <td className="px-5 py-2 text-right font-semibold">
                            {formatMoney(o.agreedAmount ?? 0, o.orderCurrency)}
                          </td>
                          <td
                            className={`px-5 py-2 text-right font-bold ${
                              d > 0 ? "text-danger" : "text-success"
                            }`}
                          >
                            {d > 0 ? "−" : "✓"}
                            {formatMoney(Math.abs(d), o.orderCurrency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <CreditCard size={16} className="text-primary" />
              <h3 className="font-bold">To'lovlar tarixi ({payments.length})</h3>
            </div>
            {payments.length === 0 ? (
              <p className="p-6 text-center text-ink-soft text-sm">
                To'lovlar yo'q
              </p>
            ) : (
              <div className="space-y-1 p-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {paymentTxLabel[p.type]}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {formatDateTime(p.date)}
                      </p>
                    </div>
                    <span
                      className={`font-bold ${
                        ["CASH_IN", "BANK_IN"].includes(p.type)
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {["CASH_IN", "BANK_IN"].includes(p.type) ? "+" : "−"}
                      {formatMoney(p.amount, p.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {client.counterpartyNotes.length > 0 && (
            <div className="panel p-5">
              <h3 className="font-bold mb-3">Izohlar</h3>
              <ul className="space-y-2">
                {client.counterpartyNotes.map((n) => (
                  <li key={n.id} className="text-sm p-2 rounded-lg bg-gray-50">
                    <p>{n.text}</p>
                    <p className="text-xs text-ink-soft mt-1">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
