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
  Menu,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavChild {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
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
      { label: "Filiallar", href: "/filiallar", icon: Building2 },
      { label: "Konteynerlar", href: "/xaridlar", icon: Truck },
    ],
  },
  {
    label: "Mijozlar",
    href: "/mijozlar",
    icon: Users,
    children: [
      { label: "Mijozlar ro'yxati", href: "/mijozlar", icon: Users },
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
      { label: "Oyliklar", href: "/xodimlar/oylik", icon: Wallet },
    ],
  },
  { label: "Hisobotlar", href: "/hisobotlar", icon: BarChart3 },
  { label: "Sozlamalar", href: "/sozlamalar", icon: Settings },
];

interface Props {
  user: { name: string; role: string };
  allowedHrefs: string[];
}

function filterNav(items: NavItem[], allowed: Set<string>): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    const kids = item.children?.filter((c) => allowed.has(c.href)) ?? undefined;
    // Item o'zi allowed OR kamida bitta bola allowed bo'lsa — ko'rsat
    const selfOk = allowed.has(item.href);
    if (selfOk || (kids && kids.length > 0)) {
      out.push({ ...item, children: kids });
    }
  }
  return out;
}

export default function Sidebar({ user, allowedHrefs }: Props) {
  const allowedSet = new Set(allowedHrefs);
  const filteredNav = filterNav(navigation, allowedSet);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "/buyurtmalar": true,
    "/omborxona": true,
    "/mijozlar": true,
    "/moliya": true,
    "/xodimlar": false,
  });

  // Sahifa o'zgarganda mobile drawer avtomatik yopilsin
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Mobile drawer ochilganda body scroll'ni to'xtatish
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleSection = (href: string) =>
    setOpenSections((p) => ({ ...p, [href]: !p[href] }));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile hamburger — faqat kichik ekranlarda */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-2 left-3 z-30 p-2 rounded-xl bg-white border border-border shadow-sm hover:bg-gray-50 text-ink"
        aria-label="Menyu"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop mobile drawer ochilganda */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 animate-fadeIn"
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-white border-r border-border flex flex-col z-50 transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[260px]",
          // Mobile: drawer sifatida yopiladi/ochiladi
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        )}
      >
      <div
        className={cn(
          "flex items-center h-16 border-b border-border",
          collapsed ? "flex-col justify-center gap-1 px-0" : "justify-between px-5"
        )}
      >
        {collapsed ? (
          <Link
            href="/"
            className="text-base font-black tracking-tight text-ink leading-none"
          >
            ERP
          </Link>
        ) : (
          <Link
            href="/"
            className="text-lg font-black tracking-tight text-ink leading-tight"
          >
            ONESHOP<br />ERP
          </Link>
        )}
        <div className="flex gap-1">
          {/* Mobile: yopish */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
          {/* Desktop: yig'ish/kengaytirish */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {filteredNav.map((item) => {
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
    </>
  );
}
