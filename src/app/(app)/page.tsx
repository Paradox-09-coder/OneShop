import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import PageHeader from "@/components/page-header";
import { formatMoney, formatDate } from "@/lib/utils";
import { orderStatusLabel, orderStatusColor } from "@/lib/labels";
import {
  ShoppingCart,
  Package,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CashflowChart, CollectionGauge, type CashflowPoint } from "./dashboard-charts";
import { DeltaChip, MiniBar, Sparkline } from "./kpi-extras";
import AnimatedNumber from "@/components/animated-number";

// O'zbekiston — UTC+5, yozgi vaqt yo'q. Server (Railway) UTC'da ishlaydi,
// shuning uchun kun/oy chegaralarini aniq Toshkent vaqtida hisoblaymiz.
const TK_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Buyurtma summasini so'mga keltirish: dollar va boshqa valyutadagi
// buyurtmalar o'zida saqlangan kurs (exchangeRateSnapshot) bo'yicha
// aylantiriladi. Aks holda 5 000 $ "5 000 so'm" bo'lib qo'shilib ketardi.
const AGREED_UZS = Prisma.sql`(CASE WHEN "orderCurrency" = 'UZS' THEN COALESCE("agreedAmount", 0) ELSE COALESCE("agreedAmount", 0) * COALESCE("exchangeRateSnapshot", 0) END)`;
const PAID_UZS = Prisma.sql`(CASE WHEN "orderCurrency" = 'UZS' THEN "paidAmount" ELSE "paidAmount" * COALESCE("exchangeRateSnapshot", 0) END)`;

// "createdAt" — vaqt mintaqasisiz UTC ustun; JS Date parametri esa
// timestamptz bo'lib boradi. Solishtirishni bazaning TimeZone sozlamasiga
// bog'liq qilmaslik uchun parametrni aniq UTC'ga keltiramiz.
function utc(d: Date) {
  return Prisma.sql`(${d}::timestamptz AT TIME ZONE 'UTC')`;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null; // 0 dan o'sishni foizda ifodalab bo'lmaydi
  return ((cur - prev) / Math.abs(prev)) * 100;
}

const MONTHS_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  color?: string;
  href: string;
  /** o'ng pastki burchakdagi analitika (sparkline) */
  extra?: React.ReactNode;
  /** qiymat yonidagi o'zgarish chipi */
  delta?: React.ReactNode;
}

function StatCard({ icon, label, value, hint, color = "primary", href, extra, delta }: StatCardProps) {
  return (
    <Link
      href={href}
      className="panel p-5 hover:border-primary/40 group block relative min-w-0"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-sm text-ink font-semibold">{label}</span>
        <div
          className={`w-10 h-10 shrink-0 rounded-full grid place-items-center text-white bg-${color} shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-2xl 2xl:text-[28px] leading-tight font-bold tracking-tight text-ink min-w-0 [overflow-wrap:anywhere]">{value}</p>
        {delta}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 mt-3 min-h-10">
        {hint && <div className="text-xs text-ink-soft pb-0.5 flex-1 basis-[140px] min-w-0">{hint}</div>}
        {extra && <div className="shrink-0">{extra}</div>}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  // Toshkent bo'yicha: joriy oy boshi, o'tgan oy boshi va o'tgan oyning
  // "shu kunigacha" bo'lgan nuqtasi (oy boshidan o'tgan vaqt teng)
  const nowMs = Date.now();
  const tkNow = new Date(nowMs + TK_OFFSET_MS);
  const monthStart = new Date(Date.UTC(tkNow.getUTCFullYear(), tkNow.getUTCMonth(), 1) - TK_OFFSET_MS);
  const prevMonthStart = new Date(Date.UTC(tkNow.getUTCFullYear(), tkNow.getUTCMonth() - 1, 1) - TK_OFFSET_MS);
  const prevSamePoint = new Date(
    Math.min(prevMonthStart.getTime() + (nowMs - monthStart.getTime()), monthStart.getTime())
  );
  const todayStart = Date.UTC(tkNow.getUTCFullYear(), tkNow.getUTCMonth(), tkNow.getUTCDate()) - TK_OFFSET_MS;
  const days30Start = new Date(todayStart - 29 * DAY_MS);

  const [
    ordersThisMonth,
    ordersActive,
    unpaidTotal,
    lowStockCount,
    recentOrders,
    topClients,
    cashboxByCurrency,
    cashflowRows,
    orderCount,
    ordersPrevMtd,
    dailyOrders,
    trackedProducts,
  ] = await Promise.all([
    prisma.$queryRaw<{ s: number; n: number }[]>`
      SELECT COALESCE(SUM(${AGREED_UZS}), 0)::float AS s, COUNT(*)::int AS n
      FROM "Order"
      WHERE status <> 'CANCELLED' AND "createdAt" >= ${utc(monthStart)}
    `.then((r) => ({ _sum: { agreedAmount: r[0]?.s ?? 0 }, _count: r[0]?.n ?? 0 })),
    prisma.order.count({
      where: {
        status: {
          in: [
            "MASLAHAT_BERILDI",
            "NARX_KELISHILDI",
            "BUYURTMA_OLINDI",
            "YETKAZILMOQDA",
            "PROCESSING",
            "READY",
          ],
        },
      },
    }),
    prisma.$queryRaw<{ agreed: number; paid: number }[]>`
      SELECT COALESCE(SUM(${AGREED_UZS}), 0)::float AS agreed,
             COALESCE(SUM(${PAID_UZS}), 0)::float AS paid
      FROM "Order"
      WHERE status <> 'CANCELLED'
    `.then((r) => ({ _sum: { agreedAmount: r[0]?.agreed ?? 0, paidAmount: r[0]?.paid ?? 0 } })),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "catalogProductId")::bigint AS n
      FROM "InventoryLot"
      WHERE "qty" <= "lowStockThreshold" AND "lowStockThreshold" > 0
    `.then((r) => Number(r[0]?.n ?? 0)).catch(() => 0),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.$queryRaw<{ clientId: string; s: number }[]>`
      SELECT "clientId", COALESCE(SUM(${AGREED_UZS}), 0)::float AS s
      FROM "Order"
      WHERE status <> 'CANCELLED' AND "clientId" IS NOT NULL
      GROUP BY "clientId"
      ORDER BY s DESC
      LIMIT 5
    `.then((rows) => rows.map((r) => ({ clientId: r.clientId, _sum: { agreedAmount: r.s } }))),
    prisma.account.findMany({ where: { isActive: true } }),
    // Oxirgi 12 oy, Toshkent vaqti bo'yicha oylarga guruhlangan. Faqat so'm —
    // turli valyutalarni bitta ustunda qo'shib bo'lmaydi. Hisoblar orasidagi
    // ko'chirishlar (/api/moliya/transfer) chiqarib tashlanadi: ular bir
    // juft OUT+IN yozuv bo'lib, aks holda kirim ham, chiqim ham bo'lib
    // ikki marta sanalardi.
    prisma.$queryRaw<{ m: string; income: number; expense: number }[]>`
      SELECT to_char(date_trunc('month', ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM') AS m,
             COALESCE(SUM(CASE WHEN type IN ('CASH_IN', 'BANK_IN') THEN amount END), 0)::float AS income,
             COALESCE(SUM(CASE WHEN type IN ('CASH_OUT', 'BANK_OUT') THEN amount END), 0)::float AS expense
      FROM "Payment"
      WHERE "voidedAt" IS NULL AND currency = 'UZS'
        AND NOT ("sourceType" = 'MANUAL' AND "counterpartyId" IS NULL
                 AND ("description" LIKE 'Ko''chirish → %' OR "description" LIKE 'Ko''chirish ← %'))
        AND "date" >= (date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent') - interval '11 months') AT TIME ZONE 'Asia/Tashkent' AT TIME ZONE 'UTC'
      GROUP BY 1
    `.catch(() => [] as { m: string; income: number; expense: number }[]),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    // O'tgan oyning xuddi shu davri (1-sanadan bugungi kun/soatgacha)
    prisma.$queryRaw<{ s: number }[]>`
      SELECT COALESCE(SUM(${AGREED_UZS}), 0)::float AS s
      FROM "Order"
      WHERE status <> 'CANCELLED'
        AND "createdAt" >= ${utc(prevMonthStart)} AND "createdAt" < ${utc(prevSamePoint)}
    `.then((r) => ({ _sum: { agreedAmount: r[0]?.s ?? 0 } })),
    // Oxirgi 30 kun, Toshkent kunlari bo'yicha: savdo summasi va yangi buyurtmalar
    prisma.$queryRaw<{ d: string; amount: number; n: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS d,
             COALESCE(SUM(${AGREED_UZS}), 0)::float AS amount,
             COUNT(*)::int AS n
      FROM "Order"
      WHERE status <> 'CANCELLED' AND "createdAt" >= ${utc(days30Start)}
      GROUP BY 1
    `.catch(() => [] as { d: string; amount: number; n: number }[]),
    // Kam qoldiq chegarasi qo'yilgan (kuzatiladigan) mahsulotlar soni
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "catalogProductId")::bigint AS n
      FROM "InventoryLot"
      WHERE "lowStockThreshold" > 0
    `.then((r) => Number(r[0]?.n ?? 0)).catch(() => 0),
  ]);

  const monthTotal = ordersThisMonth._sum.agreedAmount ?? 0;
  const salesDelta = pctChange(monthTotal, ordersPrevMtd._sum.agreedAmount ?? 0);

  // 30 kunlik kunlik qatorlar — buyurtmasi yo'q kun 0 bo'lib turadi
  const byDay = new Map(dailyOrders.map((r) => [r.d, r]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const key = new Date(days30Start.getTime() + i * DAY_MS + TK_OFFSET_MS).toISOString().slice(0, 10);
    const row = byDay.get(key);
    return { amount: row?.amount ?? 0, n: row?.n ?? 0 };
  });
  const salesSpark = days.map((d) => d.amount);
  const ordersSpark = days.map((d) => d.n);
  const newThisWeek = ordersSpark.slice(-7).reduce((a, b) => a + b, 0);
  const newPrevWeek = ordersSpark.slice(-14, -7).reduce((a, b) => a + b, 0);
  const ordersDelta = pctChange(newThisWeek, newPrevWeek);
  const debt =
    (unpaidTotal._sum.agreedAmount ?? 0) - (unpaidTotal._sum.paidAmount ?? 0);

  const agreedAll = unpaidTotal._sum.agreedAmount ?? 0;
  const paidAll = unpaidTotal._sum.paidAmount ?? 0;
  const collectedPct = agreedAll > 0 ? (paidAll / agreedAll) * 100 : 0;
  const debtShare = agreedAll > 0 ? (debt / agreedAll) * 100 : 0;
  const lowShare = trackedProducts > 0 ? (lowStockCount / trackedProducts) * 100 : 0;

  // 12 ta oyni to'liq chiqaramiz — tranzaksiyasi yo'q oy ham bo'sh ustun bo'lib turadi
  const byMonth = new Map(cashflowRows.map((r) => [r.m, r]));
  const cashflow: CashflowPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(tkNow.getUTCFullYear(), tkNow.getUTCMonth() - 11 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const row = byMonth.get(key);
    return { month: key, label: MONTHS_UZ[d.getUTCMonth()], income: row?.income ?? 0, expense: row?.expense ?? 0 };
  });

  const topClientIds = topClients.map((t) => t.clientId).filter(Boolean) as string[];
  const topClientData = topClientIds.length
    ? await prisma.counterparty.findMany({
        where: { id: { in: topClientIds } },
        select: { id: true, name: true },
      })
    : [];
  const clientNameMap = Object.fromEntries(topClientData.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        back={false}
        title="Bosh sahifa"
        subtitle={`Bugun: ${formatDate(new Date())}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="Oylik savdo"
          value={<AnimatedNumber value={monthTotal} kind="money" />}
          delta={<DeltaChip value={salesDelta} />}
          hint={`${ordersThisMonth._count} ta buyurtma · o'tgan oyning shu davriga nisbatan`}
          extra={<Sparkline data={salesSpark} label="Kunlik savdo, oxirgi 30 kun" />}
          color="primary"
          href="/moliya/tranzaksiyalar?filter=income&period=month"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Aktiv buyurtmalar"
          value={<AnimatedNumber value={ordersActive} />}
          delta={<DeltaChip value={ordersDelta} />}
          hint={`Bu hafta ${newThisWeek} ta yangi · o'tgan haftaga nisbatan`}
          extra={<Sparkline data={ordersSpark} label="Kunlik yangi buyurtmalar, oxirgi 30 kun" />}
          color="info"
          href="/buyurtmalar?filter=active"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Debitor qarz"
          value={<AnimatedNumber value={debt} kind="money" />}
          hint={
            <>
              <span className="flex justify-between mb-1.5">
                <span>Jami savdodan ulushi</span>
                <b className="text-ink">{debtShare.toFixed(1).replace(".", ",")}%</b>
              </span>
              <MiniBar percent={debtShare} tone="warning" />
            </>
          }
          color="warning"
          href="/moliya/qarzdorliklar"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Kam qoldiq"
          value={<AnimatedNumber value={lowStockCount} />}
          hint={
            <>
              <span className="flex justify-between mb-1.5">
                <span>Kuzatiladigan {trackedProducts} ta mahsulotdan</span>
                <b className="text-ink">{lowShare.toFixed(0)}%</b>
              </span>
              <MiniBar percent={lowShare} tone="danger" />
            </>
          }
          color="danger"
          href="/omborxona?filter=low-stock"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 panel p-5">
          <CashflowChart data={cashflow} />
        </div>
        <div className="panel p-5">
          <CollectionGauge
            percent={collectedPct}
            orders={orderCount}
            agreed={agreedAll}
            paid={paidAll}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" />
              So'nggi buyurtmalar
            </h2>
            <Link href="/buyurtmalar" className="text-sm text-primary font-semibold">
              Barchasi →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft uppercase border-b border-border">
                  <th className="text-left px-5 py-2">Raqami</th>
                  <th className="text-left px-5 py-2">Mijoz</th>
                  <th className="text-left px-5 py-2">Holat</th>
                  <th className="text-right px-5 py-2">Summa</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/50 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/buyurtmalar/${o.id}`}
                        className="font-semibold text-primary"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">
                      {o.client?.name ?? o.clientNameSnapshot ?? "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`chip ${orderStatusColor[o.status]}`}
                      >
                        {orderStatusLabel[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold">
                      {formatMoney(o.agreedAmount ?? 0, o.orderCurrency)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                      Hozircha buyurtmalar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              Hisoblar
            </h2>
          </div>
          <div className="space-y-2">
            {cashboxByCurrency.map((a) => (
              <Link
                key={a.id}
                href={`/moliya/hisoblar/${a.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-primary/5 hover:shadow-sm transition"
              >
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-ink-soft">{a.type}</p>
                </div>
                <p className="font-bold text-ink">
                  {formatMoney(a.balanceCache, a.currency)}
                </p>
              </Link>
            ))}
            {cashboxByCurrency.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">
                Hisoblar qo'shilmagan
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Users size={18} className="text-primary" />
              TOP mijozlar
            </h2>
            <Link href="/mijozlar" className="text-sm text-primary font-semibold">
              Barchasi →
            </Link>
          </div>
          <div className="space-y-2">
            {topClients.map((c, i) => (
              <div
                key={c.clientId}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold grid place-items-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">
                    {clientNameMap[c.clientId ?? ""] ?? "—"}
                  </span>
                </div>
                <span className="font-bold">
                  {formatMoney(c._sum.agreedAmount ?? 0, "UZS")}
                </span>
              </div>
            ))}
            {topClients.length === 0 && (
              <p className="text-sm text-ink-soft text-center py-4">
                Ma'lumot yo'q
              </p>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Ombor holati
            </h2>
            <Link href="/omborxona" className="text-sm text-primary font-semibold">
              Ombor →
            </Link>
          </div>
          <p className="text-sm text-ink-soft">
            Kam qoldiqli mahsulotlar: <b>{lowStockCount}</b>
          </p>
          <p className="text-sm text-ink-soft mt-1">
            Ombordagi harakatlar oxirgi 30 kun ichida ko'rib chiqiladi.
          </p>
        </div>
      </div>
    </div>
  );
}
