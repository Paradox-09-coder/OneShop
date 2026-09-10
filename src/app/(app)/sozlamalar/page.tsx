import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { getSession } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { Users, Landmark, Layers, Building2, ArrowRightLeft, ShieldCheck, Send } from "lucide-react";
import UsersManager from "./users-manager";
import AccountsManager from "./accounts-manager";
import CategoriesManager from "./categories-manager";
import WarehousesManager from "./warehouses-manager";
import ExchangeRateManager from "./exchange-rate-manager";
import TelegramSetup from "./telegram-setup";
import { isTelegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const [users, warehouses, accounts, categories, rateSetting] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { customRole: true },
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.setting.findUnique({ where: { key: "exchange_rate_usd" } }),
  ]);
  const currentRate = (rateSetting?.value as { rate?: number } | null)?.rate ?? 12200;

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Tizim va hisoblar boshqaruvi" />

      {/* Mening rolim — tepada */}
      {session && (
        <div className="panel p-5 mb-6 border-l-4 border-l-primary bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white grid place-items-center font-bold text-xl">
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold">{session.name}</p>
              <p className="text-sm text-ink-soft">@{session.username}</p>
            </div>
            <div className="text-right">
              <div className="chip bg-primary/10 text-primary py-1.5 px-4">
                <ShieldCheck size={14} />
                <span className="font-bold ml-1">{roleLabel[session.role]}</span>
              </div>
              <p className="text-xs text-ink-soft mt-1">
                {session.permissions.length === 1 && session.permissions[0] === "*"
                  ? "Barcha ruxsatlar"
                  : `${session.permissions.length} ta ruxsat`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Foydalanuvchilar */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Foydalanuvchilar</h2>
            <span className="chip bg-gray-100 text-gray-700 ml-2">{users.length}</span>
          </header>
          <UsersManager
            users={users.map((u) => ({
              id: u.id,
              username: u.username,
              name: u.name,
              role: u.role,
              customRoleLabel: u.customRole?.label ?? null,
              isActive: u.isActive,
            }))}
          />
        </section>

        {/* Hisoblar */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <Landmark size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Hisoblar (kassa/bank)</h2>
            <span className="chip bg-gray-100 text-gray-700 ml-2">{accounts.length}</span>
          </header>
          <AccountsManager
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              currency: a.currency,
              balanceCache: a.balanceCache,
              isActive: a.isActive,
            }))}
          />
        </section>

        {/* Omborlar */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Omborlar</h2>
            <span className="chip bg-gray-100 text-gray-700 ml-2">{warehouses.length}</span>
          </header>
          <WarehousesManager
            warehouses={warehouses.map((w) => ({
              id: w.id,
              name: w.name,
              address: w.address,
              isActive: w.isActive,
            }))}
          />
        </section>

        {/* Kategoriyalar */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Mahsulot kategoriyalari</h2>
            <span className="chip bg-gray-100 text-gray-700 ml-2">{categories.length}</span>
          </header>
          <CategoriesManager
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              sortOrder: c.sortOrder,
            }))}
          />
        </section>

        {/* Valyuta kursi */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <ArrowRightLeft size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Valyuta kursi</h2>
          </header>
          <ExchangeRateManager current={currentRate} />
          <p className="text-xs text-ink-soft mt-2">
            Har yangi buyurtmada dollar tanlansa bu kurs snapshot bo'lib yopishadi.
            Joriy: <b>1 USD = {formatMoney(currentRate, "UZS")}</b>
          </p>
        </section>

        {/* Telegram bot */}
        <section className="panel p-5">
          <header className="flex items-center gap-2 mb-4">
            <Send size={20} className="text-primary" />
            <h2 className="text-lg font-bold">Telegram bot</h2>
          </header>
          <TelegramSetup configured={isTelegramConfigured()} webhookInfo={null} />
        </section>
      </div>
    </div>
  );
}
