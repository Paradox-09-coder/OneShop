import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils";
import {
  counterpartyTypeLabel,
  orderStatusLabel,
  orderStatusColor,
  paymentTxLabel,
} from "@/lib/labels";
import { getSession, hasPermission } from "@/lib/auth";
import {
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  Mail,
  ShoppingCart,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { EditPartyButton, DeletePartyButton } from "./party-actions";

export const dynamic = "force-dynamic";

export default async function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const raw = await params;
  const id = decodeURIComponent(raw.id);
  const party = await prisma.counterparty.findUnique({
    where: { id },
    include: {
      employee: true,
      counterpartyNotes: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!party || party.deletedAt) notFound();

  const session = await getSession();
  const canWrite = hasPermission(session, "counterparties.write");

  const [orders, payments, ordersAgg] = await Promise.all([
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

  const totalOrdered = ordersAgg._sum.agreedAmount ?? 0;
  const totalPaid = ordersAgg._sum.paidAmount ?? 0;
  const debt = totalOrdered - totalPaid;
  const isClient = party.type === "CLIENT";

  return (
    <div>
      <PageHeader
        back="/kontragentlar"
        title={party.name}
        subtitle={
          counterpartyTypeLabel[party.type] +
          (party.employee?.position ? ` · ${party.employee.position}` : "") +
          (party.status !== "active" ? " · nofaol" : "")
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isClient && (
              <Link
                href={`/mijozlar/${encodeURIComponent(party.id)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-panel text-sm font-semibold hover:border-primary/40 hover:text-primary transition"
              >
                <ExternalLink size={15} /> Mijoz kartochkasi
              </Link>
            )}
            {canWrite && (
              <>
                <EditPartyButton
                  party={{
                    id: party.id,
                    name: party.name,
                    type: party.type,
                    phone: party.phone,
                    phone2: party.phone2,
                    email: party.email,
                    telegram: party.telegram,
                    address: party.address,
                    inn: party.inn,
                    status: party.status,
                  }}
                />
                <DeletePartyButton id={party.id} name={party.name} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold mb-3">Kontakt</h3>
            <dl className="space-y-2 text-sm">
              {party.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-ink-soft" />
                  <a href={`tel:${party.phone}`} className="font-semibold text-primary">
                    {party.phone}
                  </a>
                </div>
              )}
              {party.phone2 && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-ink-soft" />
                  <span>{party.phone2}</span>
                </div>
              )}
              {party.telegram && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-ink-soft" />
                  <span>{party.telegram}</span>
                </div>
              )}
              {party.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-ink-soft" />
                  <span>{party.email}</span>
                </div>
              )}
              {party.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-ink-soft mt-0.5" />
                  <span>{party.address}</span>
                </div>
              )}
              {party.inn && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-ink-soft" />
                  <span>INN: {party.inn}</span>
                </div>
              )}
              {!party.phone && !party.phone2 && !party.telegram && !party.email && !party.address && !party.inn && (
                <p className="text-ink-soft">Kontakt ma'lumotlari kiritilmagan</p>
              )}
            </dl>
          </div>

          <div className="panel p-5">
            <h3 className="font-bold mb-3">Hisob-kitob</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Balans</dt>
                <dd className="font-bold">{formatMoney(party.balanceValue, party.balanceCurrency)}</dd>
              </div>
              {ordersAgg._count > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">Buyurtmalar</dt>
                    <dd className="font-semibold">{ordersAgg._count} ta</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">Umumiy summa</dt>
                    <dd className="font-semibold">{formatMoney(totalOrdered, party.balanceCurrency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">To'landi</dt>
                    <dd className="font-semibold text-success">{formatMoney(totalPaid, party.balanceCurrency)}</dd>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between">
                    <dt className="font-bold">Qarz</dt>
                    <dd className={`font-bold ${debt > 0 ? "text-danger" : "text-success"}`}>
                      {formatMoney(debt, party.balanceCurrency)}
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Qo'shildi</dt>
                <dd>{formatDate(party.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {orders.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary" />
                <h3 className="font-bold">Buyurtmalar ({orders.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                      <th className="text-left px-5 py-2">Raqami</th>
                      <th className="text-left px-5 py-2">Sana</th>
                      <th className="text-left px-5 py-2">Holat</th>
                      <th className="text-right px-5 py-2">Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-border/50">
                        <td className="px-5 py-2">
                          <Link href={`/buyurtmalar/${o.id}`} className="font-semibold text-primary">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-2 text-ink-soft">{formatDate(o.createdAt)}</td>
                        <td className="px-5 py-2">
                          <span className={`chip ${orderStatusColor[o.status]}`}>
                            {orderStatusLabel[o.status]}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-right font-semibold">
                          {formatMoney(o.agreedAmount ?? 0, o.orderCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <CreditCard size={16} className="text-primary" />
              <h3 className="font-bold">To'lovlar tarixi ({payments.length})</h3>
            </div>
            {payments.length === 0 ? (
              <p className="p-6 text-center text-ink-soft text-sm">To'lovlar yo'q</p>
            ) : (
              <div className="space-y-1 p-3">
                {payments.map((p) => {
                  const isIn = ["CASH_IN", "BANK_IN"].includes(p.type);
                  return (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-semibold">{paymentTxLabel[p.type]}</p>
                        <p className="text-xs text-ink-soft">{formatDateTime(p.date)}</p>
                      </div>
                      <span className={`font-bold ${isIn ? "text-success" : "text-danger"}`}>
                        {isIn ? "+" : "−"}
                        {formatMoney(p.amount, p.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {party.counterpartyNotes.length > 0 && (
            <div className="panel p-5">
              <h3 className="font-bold mb-3">Izohlar</h3>
              <ul className="space-y-2">
                {party.counterpartyNotes.map((n) => (
                  <li key={n.id} className="text-sm p-2 rounded-lg bg-gray-50">
                    <p>{n.text}</p>
                    <p className="text-xs text-ink-soft mt-1">{formatDateTime(n.createdAt)}</p>
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
