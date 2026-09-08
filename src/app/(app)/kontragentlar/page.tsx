import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import { counterpartyTypeLabel } from "@/lib/labels";
import CounterpartyForm from "./form";

export default async function CounterpartiesPage() {
  const parties = await prisma.counterparty.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

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
            <h3 className="font-bold">Ro'yxat</h3>
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
                {parties.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-semibold">{p.name}</td>
                    <td className="px-4 py-2">
                      <span className="chip bg-slate-100 text-slate-700">
                        {counterpartyTypeLabel[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{p.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatMoney(p.balanceValue, p.balanceCurrency)}
                    </td>
                    <td className="px-4 py-2 text-ink-soft">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
                {parties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                      Kontragentlar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
