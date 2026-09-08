import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDate } from "@/lib/utils";
import { customerKindLabel } from "@/lib/labels";
import { Users, Plus } from "lucide-react";

export default async function ClientsPage() {
  const clients = await prisma.counterparty.findMany({
    where: { type: "CLIENT", deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      clientProfile: true,
      _count: { select: { ordersAsClient: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Mijozlar"
        subtitle={`${clients.length} ta mijoz`}
        actions={
          <Link
            href="/kontragentlar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border font-semibold hover:bg-gray-50"
          >
            <Plus size={16} /> Kontragentlar orqali qo'shish
          </Link>
        }
      />

      <div className="panel overflow-hidden">
        {clients.length === 0 ? (
          <EmptyState
            title="Mijozlar yo'q"
            message="Kontragentlar sahifasidan mijoz qo'shing"
            icon={<Users size={22} />}
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
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="px-5 py-3 font-semibold">{c.name}</td>
                    <td className="px-5 py-3 text-ink-soft">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3">
                      {c.clientProfile
                        ? customerKindLabel[c.clientProfile.customerKind]
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c._count.ordersAsClient}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
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
