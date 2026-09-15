import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import SectionTabs from "@/components/section-tabs";
import EmptyState from "@/components/empty-state";
import { formatMoney, formatDateTime, cn } from "@/lib/utils";
import { paymentTxLabel, paymentSourceLabel, accountTypeLabel } from "@/lib/labels";
import { CreditCard, Wallet, Landmark, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import ListToolbar from "@/components/list-toolbar";
import Pagination from "@/components/pagination";
import TransferButton from "../transfer-button";
import NewTransactionButton from "./new-transaction-button";
import Link from "next/link";
import type { PaymentTxType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

const IN_TYPES: PaymentTxType[] = ["CASH_IN", "BANK_IN"];
const OUT_TYPES: PaymentTxType[] = ["CASH_OUT", "BANK_OUT"];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const pageSize = 30;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/moliya/tranzaksiyalar?${qs}` : "/moliya/tranzaksiyalar";
  }

  const baseWhere: Prisma.PaymentWhereInput = {
    ...(sp.type ? { type: sp.type as PaymentTxType } : {}),
    ...(sp.from || sp.to
      ? {
          date: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { counterpartyNameSnapshot: { contains: sp.q, mode: "insensitive" } },
            { counterparty: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
            { category: { is: { name: { contains: sp.q, mode: "insensitive" } } } },
            { description: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [visible, totalCount, accounts, counterparties, kirimGroups, chiqimGroups] =
    await Promise.all([
      prisma.payment.findMany({
        where: baseWhere,
        orderBy: { date: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
          account: { select: { name: true } },
          counterparty: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.payment.count({ where: baseWhere }),
      prisma.account.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
      prisma.counterparty.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: 300,
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { AND: [baseWhere, { type: { in: IN_TYPES } }] },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { AND: [baseWhere, { type: { in: OUT_TYPES } }] },
        _sum: { amount: true },
      }),
    ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const activeAccounts = accounts.filter((a) => a.isActive);

  // Ustuvor valyuta — UZS bo'lsa shuni, aks holda birinchi topilgan valyuta.
  const currencies = Array.from(new Set(activeAccounts.map((a) => a.currency)));
  const primaryCurrency = currencies.includes("UZS") ? "UZS" : (currencies[0] ?? "UZS");
  const totalByCurrency = new Map<string, number>();
  for (const a of activeAccounts) {
    totalByCurrency.set(a.currency, (totalByCurrency.get(a.currency) ?? 0) + a.balanceCache);
  }
  const primaryTotal = totalByCurrency.get(primaryCurrency) ?? 0;
  const cashTotal = activeAccounts
    .filter((a) => a.currency === primaryCurrency && a.type === "CASH")
    .reduce((s, a) => s + a.balanceCache, 0);
  const bankTotal = activeAccounts
    .filter((a) => a.currency === primaryCurrency && a.type === "BANK")
    .reduce((s, a) => s + a.balanceCache, 0);
  const otherCurrencyTotals = Array.from(totalByCurrency.entries()).filter(
    ([c]) => c !== primaryCurrency
  );

  function sumFor(groups: { currency: string; _sum: { amount: number | null } }[], currency: string) {
    return groups.find((g) => g.currency === currency)?._sum.amount ?? 0;
  }
  const kirim = sumFor(kirimGroups, primaryCurrency);
  const chiqim = sumFor(chiqimGroups, primaryCurrency);

  return (
    <div>
      <PageHeader
        title="Tranzaksiyalar"
        subtitle="Barcha pul harakatlari bir joyda"
        actions={
          <div className="flex items-center gap-2">
            {accounts.length >= 2 && (
              <TransferButton
                accounts={accounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  currency: a.currency,
                  balanceCache: a.balanceCache,
                }))}
              />
            )}
            <NewTransactionButton
              accounts={activeAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
              counterparties={counterparties}
            />
          </div>
        }
      />

      <SectionTabs
        tabs={[
          { label: "Tranzaksiyalar", href: "/moliya/tranzaksiyalar" },
          { label: "Qarzdorliklar", href: "/moliya/qarzdorliklar" },
        ]}
      />

      {/* Umumiy ko'rsatkichlar */}
      <div className="panel p-5 mb-4 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <div className="lg:pr-8 lg:border-r lg:border-border shrink-0">
          <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
            Jami balans
          </p>
          <p className="text-3xl font-bold text-ink tabular-nums mt-1 leading-none">
            {formatMoney(primaryTotal, primaryCurrency)}
          </p>
          <div className="flex items-center gap-4 mt-2.5 text-xs tabular-nums flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-ink-soft">Naqd</span>
              <span className="font-semibold text-ink">{formatMoney(cashTotal, primaryCurrency)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-ink-soft">Bank</span>
              <span className="font-semibold text-ink">{formatMoney(bankTotal, primaryCurrency)}</span>
            </span>
            {otherCurrencyTotals.map(([c, sum]) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className="text-ink-soft">{c}:</span>
                <span className="font-semibold text-ink">{formatMoney(sum, c)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-8 sm:gap-10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-success/10 text-success grid place-items-center">
                <ArrowUpRight size={13} />
              </span>
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Kirim</span>
            </div>
            <p className="text-lg font-bold text-success tabular-nums mt-1.5 leading-none">
              {formatMoney(kirim, primaryCurrency)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-danger/10 text-danger grid place-items-center">
                <ArrowDownRight size={13} />
              </span>
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Chiqim</span>
            </div>
            <p className="text-lg font-bold text-danger tabular-nums mt-1.5 leading-none">
              {formatMoney(chiqim, primaryCurrency)}
            </p>
          </div>
        </div>
      </div>

      {/* Hisob kartalari */}
      {activeAccounts.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-0.5 px-0.5 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible mb-4">
          {activeAccounts.map((a, i) => (
            <Link
              key={a.id}
              href={`/moliya/hisoblar/${a.id}`}
              className={cn(
                "shrink-0 w-[220px] sm:w-auto rounded-2xl p-4 text-white shadow-sm bg-gradient-to-br relative overflow-hidden hover:opacity-95 transition",
                CARD_GRADIENTS[i % CARD_GRADIENTS.length]
              )}
            >
              <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/10" />
              <div className="relative flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  {a.type === "BANK" ? <Landmark size={17} /> : <Wallet size={17} />}
                </span>
              </div>
              <p className="relative mt-4 text-sm font-semibold truncate">{a.name}</p>
              <p className="relative text-[10px] uppercase tracking-widest text-white/70">
                {accountTypeLabel[a.type]}
              </p>
              <p className="relative mt-2 text-lg font-bold tabular-nums leading-tight">
                {formatMoney(a.balanceCache, a.currency)}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <ListToolbar
            popover
            searchPlaceholder="Manba, izoh, kategoriya..."
            selects={[
              {
                key: "type",
                label: "Turi",
                options: Object.entries(paymentTxLabel).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
            ]}
            dateRange={{ label: "Sana" }}
          />
        </div>
        <a
          href={`/api/moliya/tranzaksiyalar/export?${new URLSearchParams({
            ...(sp.q ? { q: sp.q } : {}),
            ...(sp.type ? { type: sp.type } : {}),
            ...(sp.from ? { from: sp.from } : {}),
            ...(sp.to ? { to: sp.to } : {}),
          }).toString()}`}
          className="inline-flex items-center gap-1.5 h-[42px] px-3.5 rounded-xl border border-border bg-white text-sm font-semibold text-ink-soft hover:bg-gray-50 shrink-0"
        >
          <Download size={15} /> Yuklab olish
        </a>
      </div>

      <div className="panel overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            title="Tranzaksiyalar yo'q"
            icon={<CreditCard size={22} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
                  <th className="text-left px-4 py-3">Sana</th>
                  <th className="text-left px-4 py-3">Tur</th>
                  <th className="text-left px-4 py-3">Kategoriya</th>
                  <th className="text-left px-4 py-3">Kontragent</th>
                  <th className="text-left px-4 py-3">Manba</th>
                  <th className="text-left px-4 py-3">Hisob</th>
                  <th className="text-right px-4 py-3">Summa</th>
                  <th className="text-left px-4 py-3">Izoh</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const isIn = IN_TYPES.includes(p.type);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border/50 hover:bg-gray-50/50 ${
                        p.voidedAt ? "opacity-40 line-through" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {formatDateTime(p.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider",
                            isIn ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          )}
                        >
                          {isIn ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {isIn ? "Kirim" : "Chiqim"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{paymentTxLabel[p.type]}</td>
                      <td className="px-4 py-3 font-medium">
                        {p.counterparty?.name ?? p.counterpartyNameSnapshot ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip bg-gray-100 text-gray-600 text-[10.5px]">
                          {paymentSourceLabel[p.sourceType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{p.account?.name ?? "—"}</td>
                      <td
                        className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                          isIn ? "text-success" : "text-danger"
                        }`}
                      >
                        {isIn ? "+" : "−"}
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-ink-soft max-w-[220px] truncate">
                        {p.description ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          buildHref={(p) => hrefWith({ page: String(p) })}
        />
      </div>
    </div>
  );
}
