import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import { counterpartyTypeLabel } from "@/lib/labels";
import CounterpartyForm from "./form";
import ListToolbar from "@/components/list-toolbar";
import LoadMore from "@/components/load-more";
import type { CounterpartyType, Prisma } from "@prisma/client";

export default async function CounterpartiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    take?: string;
  }>;
}) {
  const sp = await searchParams;
  const take = Number(sp.take) || 30;

  const where: Prisma.CounterpartyWhereInput = {
    deletedAt: null,
    ...(sp.type ? { type: sp.type as CounterpartyType } : {}),
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

  const parties = await prisma.counterparty.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });
  const hasMore = parties.length > take;
  const visible = parties.slice(0, take);

  return (
    <div>
      <PageHeader
        title="Kontragentlar"
        subtitle="Mijozlar, ta'minotchilar, xodimlar va ta'sischilar"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5">
          <h3 className="font-bold mb-3">Yangi kontragent</h3>
          <CounterpartyForm />
        </div>

        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold mb-3">Ro'yxat</h3>
            <ListToolbar
              searchPlaceholder="Ism yoki telefon bo'yicha qidirish..."
              selects={[
                {
                  key: "type",
                  label: "Turi",
                  options: Object.entries(counterpartyTypeLabel).map(
                    ([value, label]) => ({ value, label })
                  ),
                },
              ]}
              dateRange={{ label: "Sana" }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-4 py-2">Nomi</th>
                  <th className="text-left px-4 py-2">Turi</th>
                  <th className="text-left px-4 py-2">Telefon</th>
                  <th className="text-right px-4 py-2">Balans</th>
                  <th className="text-left px-4 py-2">Sana</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-semibold">{p.name}</td>
                    <td className="px-4 py-2">
                      <span className="chip bg-slate-100 text-slate-700">
                        {counterpartyTypeLabel[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{p.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                      {formatMoney(p.balanceValue, p.balanceCurrency)}
                    </td>
                    <td className="px-4 py-2 text-ink-soft">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                      Kontragentlar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <LoadMore hasMore={hasMore} />
        </div>
      </div>
    </div>
  );
}
