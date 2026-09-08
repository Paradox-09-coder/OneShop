import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { roleLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { Users, Building2, Landmark, Layers, Bell } from "lucide-react";

interface CardProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
  href: string;
  count?: number;
}

function Card({ icon, title, hint, href, count }: CardProps) {
  return (
    <Link
      href={href}
      className="panel p-5 hover:border-primary hover:shadow-md transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-ink-soft">{hint}</p>
        </div>
        {count !== undefined && (
          <span className="text-lg font-bold">{count}</span>
        )}
      </div>
    </Link>
  );
}

export default async function SettingsPage() {
  const [users, warehouses, accounts, categories, notifs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { customRole: true },
    }),
    prisma.warehouse.count(),
    prisma.account.count(),
    prisma.productCategory.count(),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sozlamalar"
        subtitle="Tizim sozlamalari va foydalanuvchilar"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card
          icon={<Users size={20} />}
          title="Foydalanuvchilar"
          hint="Foydalanuvchilar va rollar"
          href="/sozlamalar"
          count={users.length}
        />
        <Card
          icon={<Building2 size={20} />}
          title="Omborlar"
          hint="Ombor filiallari"
          href="/sozlamalar"
          count={warehouses}
        />
        <Card
          icon={<Landmark size={20} />}
          title="Hisoblar"
          hint="Kassa va bank hisoblari"
          href="/moliya/hisoblar"
          count={accounts}
        />
        <Card
          icon={<Layers size={20} />}
          title="Kategoriyalar"
          hint="Mahsulot kategoriyalari"
          href="/katalog"
          count={categories}
        />
        <Card
          icon={<Bell size={20} />}
          title="Bildirishnomalar"
          hint="O'qilmagan"
          href="/xabarnomalar"
          count={notifs}
        />
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold">Foydalanuvchilar</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-soft uppercase border-b border-border bg-gray-50/50">
              <th className="text-left px-5 py-3">Foydalanuvchi</th>
              <th className="text-left px-5 py-3">Ismi</th>
              <th className="text-left px-5 py-3">Rol</th>
              <th className="text-left px-5 py-3">Holat</th>
              <th className="text-left px-5 py-3">Qo'shildi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-5 py-3 font-mono text-primary">{u.username}</td>
                <td className="px-5 py-3 font-semibold">{u.name}</td>
                <td className="px-5 py-3">
                  <span className="chip bg-primary/10 text-primary">
                    {u.customRole?.label ?? roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.isActive ? (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      Faol
                    </span>
                  ) : (
                    <span className="chip bg-rose-100 text-rose-700">Bloklangan</span>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
