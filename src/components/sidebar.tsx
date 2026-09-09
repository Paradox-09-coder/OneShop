"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Building2,
  UserCog,
  Wallet,
  Target,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Truck,
  Layers,
  PackageOpen,
  Receipt,
  CreditCard,
  Calendar,
  Landmark,
  UserSquare,
  FileBarChart,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string; icon: React.ElementType; badge?: number }[];
  badge?: number;
}

const navigation: NavItem[] = [
  { label: "Bosh sahifa", href: "/", icon: Home },
  {
    label: "Buyurtmalar",
    href: "/buyurtmalar",
    icon: ShoppingCart,
    children: [
      { label: "Barcha buyurtmalar", href: "/buyurtmalar", icon: ClipboardList },
      { label: "Yangi buyurtma", href: "/buyurtmalar/yangi", icon: ShoppingCart },
      { label: "Kassa (POS)", href: "/pos", icon: Receipt },
    ],
  },
  {
    label: "Ombor",
    href: "/omborxona",
    icon: Package,
    children: [
      { label: "Mahsulotlar", href: "/omborxona", icon: PackageOpen },
      { label: "Katalog", href: "/katalog", icon: Layers },
      { label: "Konteynerlar", href: "/xaridlar", icon: Truck },
    ],
  },
  {
    label: "Mijozlar va CRM",
    href: "/mijozlar",
    icon: Users,
    children: [
      { label: "Mijozlar", href: "/mijozlar", icon: Users },
      { label: "CRM voronka", href: "/crm", icon: Target },
      { label: "Kontragentlar", href: "/kontragentlar", icon: Building2 },
    ],
  },
  {
    label: "Moliya",
    href: "/moliya",
    icon: Wallet,
    children: [
      { label: "Umumiy", href: "/moliya", icon: Wallet },
      { label: "Tranzaksiyalar", href: "/moliya/tranzaksiyalar", icon: CreditCard },
      { label: "Hisoblar", href: "/moliya/hisoblar", icon: Landmark },
      { label: "Qarzdorliklar", href: "/moliya/qarzdorliklar", icon: FileBarChart },
      { label: "Kalendar", href: "/moliya/kalendar", icon: Calendar },
    ],
  },
  {
    label: "Xodimlar",
    href: "/xodimlar",
    icon: UserCog,
    children: [
      { label: "Xodimlar ro'yxati", href: "/xodimlar", icon: UserSquare },
      { label: "Davomad", href: "/xodimlar/davomad", icon: Calendar },
      { label: "Oyliklar", href: "/xodimlar/oylik", icon: Wallet },
    ],
  },
  { label: "Hisobotlar", href: "/hisobotlar", icon: BarChart3 },
  { label: "Sozlamalar", href: "/sozlamalar", icon: Settings },
];

interface Props {
  user: { name: string; role: string };
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "/buyurtmalar": true,
    "/omborxona": true,
    "/mijozlar": true,
    "/moliya": true,
    "/xodimlar": false,
  });

  const toggleSection = (href: string) =>
    setOpenSections((p) => ({ ...p, [href]: !p[href] }));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-border flex flex-col z-40 transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between px-5 h-16 border-b border-border">
        {!collapsed && (
          <Link href="/" className="text-lg font-black tracking-tight text-ink leading-tight">
            ONESHOP<br/>ERP
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const hasChildren = !!item.children?.length;
          const isOpen = openSections[item.href];

          return (
            <div key={item.href} className="mb-0.5">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleSection(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active ? "text-ink bg-gray-50" : "text-ink-soft hover:text-ink hover:bg-gray-50"
                    )}
                  >
                    <item.icon size={20} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={16}
                          className={cn("transition-transform", isOpen && "rotate-180")}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
                              childActive
                                ? "bg-primary text-white font-semibold"
                                : "text-ink-soft hover:text-ink hover:bg-gray-50"
                            )}
                          >
                            <child.icon size={17} />
                            <span className="flex-1">{child.label}</span>
                            {child.badge && (
                              <span className="bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-white font-semibold"
                      : "text-ink-soft hover:text-ink hover:bg-gray-50"
                  )}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-bold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
              <p className="text-xs text-ink-soft truncate">{user.role}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1.5 rounded-lg hover:bg-white text-ink-soft hover:text-danger"
                aria-label="Chiqish"
                title="Chiqish"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
