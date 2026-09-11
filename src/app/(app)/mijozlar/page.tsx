import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import { customerKindLabel } from "@/lib/labels";
import { Users, Plus, Phone } from "lucide-react";
import AddClientButton from "./add-client-button";
import ListToolbar from "@/components/list-toolbar";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;

  const where: Prisma.CounterpartyWhereInput = {
    type: "CLIENT",
    deletedAt: null,
    ...(sp.kind ? { clientProfile: { is: { customerKind: sp.kind as "RETAIL" | "RESELLER" } } } : {}),
    ...(sp.from || sp.to
      ? {
          createdAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { phone: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const clients = await prisma.counterparty.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      clientProfile: true,
      _count: { select: { ordersAsClient: true } },
    },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Mijozlar"
        subtitle={`${clients.length} ta mijoz`}
        actions={<AddClientButton />}
      />

      <ListToolbar
        searchPlaceholder="Ism yoki telefon bo'yicha qidirish..."
        selects={[
          {
            key: "kind",
            label: "Turi",
            options: [
              { value: "RETAIL", label: "Chakana" },
              { value: "RESELLER", label: "Qayta sotuvchi" },
            ],
          },
        ]}
        dateRange={{ label: "Qo'shilgan sana" }}
      />

      <div className="panel overflow-hidden">
        {clients.length === 0 ? (
          <EmptyState
            title="Mijozlar yo'q"
            message="Yangi mijoz qo'shish uchun yuqoridagi tugmani bosing"
            icon={<Users size={22} />}
            action={<AddClientButton />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-5 py-3">Ismi</th>
                  <th className="text-left px-5 py-3">Telefon</th>
                  <th className="text-left px-5 py-3">Turi</th>
                  <th className="text-center px-5 py-3">Buyurtmalar</th>
                  <th className="text-right px-5 py-3">Balans</th>
                  <th className="text-left px-5 py-3">Qo'shildi</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/mijozlar/${encodeURIComponent(c.id)}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          <Phone size={12} /> {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.clientProfile ? (
                        <span
                          className={`chip ${
                            c.clientProfile.customerKind === "RESELLER"
                              ? "bg-fuchsia-100 text-fuchsia-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {customerKindLabel[c.clientProfile.customerKind]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c._count.ordersAsClient}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                      <span
                        className={
                          c.balanceValue < 0
                            ? "text-danger"
                            : c.balanceValue > 0
                              ? "text-success"
                              : ""
                        }
                      >
                        {formatMoney(c.balanceValue, c.balanceCurrency)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
