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
  Target,
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
      { label: "Konteynerlar", href: "/xaridlar", icon: Truck },
    ],
  },
  {
    label: "Mijozlar",
    href: "/mijozlar",
    icon: Users,
    children: [
      { label: "Mijozlar ro'yxati", href: "/mijozlar", icon: Users },
      { label: "CRM (Kanban)", href: "/crm", icon: Target },
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
          "fixed left-0 top-0 h-screen bg-[#0f172a] flex flex-col z-50 transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[260px]",
          // Mobile: drawer sifatida yopiladi/ochiladi
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        )}
      >
      <div
        className={cn(
          "flex items-center h-16 border-b border-white/10",
          collapsed ? "flex-col justify-center gap-1 px-0" : "justify-between px-5"
        )}
      >
        {collapsed ? (
          <Link href="/" aria-label="OneShop ERP">
            <span className="w-9 h-9 rounded-xl bg-primary text-white grid place-items-center font-black text-base">
              O
            </span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-primary text-white grid place-items-center font-black text-base">
              O
            </span>
            <span className="text-base font-black tracking-tight text-white leading-tight">
              OneShop<br />ERP
            </span>
          </Link>
        )}
        <div className="flex gap-1">
          {/* Mobile: yopish */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
          {/* Desktop: yig'ish/kengaytirish */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
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
                      "w-full flex items-center gap-2.5 px-3 rounded-lg transition-colors",
                      collapsed ? "py-2.5 justify-center" : "py-2 mt-2",
                      active ? "text-slate-300" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <item.icon size={16} className="opacity-70" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn("transition-transform opacity-60", isOpen && "rotate-180")}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && (
                    <div className="ml-2 mt-0.5 pl-3 border-l-2 border-white/10 space-y-0.5">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm border-l-2 transition-colors",
                              childActive
                                ? "bg-primary/15 border-primary text-white font-semibold"
                                : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <child.icon size={17} className={childActive ? "text-primary-light" : ""} />
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border-l-2 transition-colors",
                    active
                      ? "bg-primary/15 border-primary text-white font-semibold"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={20} className={active ? "text-primary-light" : ""} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-bold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-danger"
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
