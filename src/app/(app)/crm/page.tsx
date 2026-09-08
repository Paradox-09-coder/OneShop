import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { Target } from "lucide-react";

export default async function CrmPage() {
  const [stages, clients] = await Promise.all([
    prisma.crmStageConfig.findMany({
      where: { funnel: "LEAD" },
      orderBy: { order: "asc" },
    }),
    prisma.counterparty.findMany({
      where: {
        type: "CLIENT",
        deletedAt: null,
        clientProfile: { funnel: "LEAD" },
      },
      include: { clientProfile: true },
      take: 200,
    }),
  ]);

  const byStage = new Map<string, typeof clients>();
  for (const s of stages) byStage.set(s.stageKey, []);
  for (const c of clients) {
    const k = c.clientProfile?.stage ?? "new";
    if (!byStage.has(k)) byStage.set(k, []);
    byStage.get(k)!.push(c);
  }

  return (
    <div>
      <PageHeader
        title="CRM — Lead voronka"
        subtitle="Mijozlarning bosqichma-bosqich holati"
      />

      {stages.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-ink-soft mb-4">
            <Target size={24} />
          </div>
          <h3 className="font-semibold">CRM bosqichlari sozlanmagan</h3>
          <p className="text-sm text-ink-soft mt-1">
            Sozlamalar sahifasidan yoki seed skriptidan bosqichlarni yarating
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((s) => {
              const list = byStage.get(s.stageKey) ?? [];
              return (
                <div
                  key={s.id}
                  className="w-72 flex-shrink-0 panel p-3"
                  style={s.color ? { borderTopColor: s.color, borderTopWidth: 4 } : {}}
                >
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="font-bold text-sm">{s.label}</span>
                    <span className="chip bg-gray-100 text-gray-700">
                      {list.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {list.slice(0, 20).map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm cursor-pointer transition"
                      >
                        <p className="font-semibold text-sm">{c.name}</p>
                        {c.phone && (
                          <p className="text-xs text-ink-soft">{c.phone}</p>
                        )}
                        <p className="text-xs text-ink-soft mt-1">
                          {formatDate(c.createdAt)}
                        </p>
                      </div>
                    ))}
                    {list.length === 0 && (
                      <p className="text-xs text-ink-soft text-center py-4">
                        Bo'sh
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
