"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Receipt,
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
  // Shu href'dan tashqari, boshqa qaysi yo'llarda ham bu band "faol"
  // ko'rinishi kerak — masalan Ombor bo'limi endi bitta tugma, lekin
  // Katalog ham o'sha bo'limning ichki tab'i.
  matchHrefs?: string[];
}

const navigation: NavItem[] = [
  { label: "Bosh sahifa", href: "/", icon: Home },
  // Buyurtmalar va Kassa — guruh emas, alohida bo'limlar. Yangi buyurtma,
  // buyurtma kartochkasi kabi ichki sahifalar ham "Buyurtmalar"ni faol qiladi.
  { label: "Buyurtmalar", href: "/buyurtmalar", icon: ShoppingCart },
  { label: "Kassa (POS)", href: "/pos", icon: Receipt },
  {
    label: "Omborxona",
    href: "/omborxona",
    icon: Package,
    matchHrefs: ["/katalog"],
  },
  {
    label: "Mijozlar",
    href: "/mijozlar",
    icon: Users,
    matchHrefs: ["/kontragentlar"],
  },
  {
    label: "Moliya",
    href: "/moliya/tranzaksiyalar",
    icon: Wallet,
    matchHrefs: ["/moliya", "/moliya/hisoblar", "/moliya/qarzdorliklar"],
  },
  {
    label: "Xodimlar",
    href: "/xodimlar",
    icon: UserCog,
    matchHrefs: ["/xodimlar/oylik"],
  },
  { label: "Hisobotlar", href: "/hisobotlar", icon: BarChart3 },
  { label: "Sozlamalar", href: "/sozlamalar", icon: Settings },
];

interface Props {
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

export default function Sidebar({ allowedHrefs }: Props) {
  const allowedSet = new Set(allowedHrefs);
  const filteredNav = filterNav(navigation, allowedSet);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "/omborxona": true,
    "/xodimlar": false,
  });
  // Bosilgan, lekin sahifasi hali yuklanmagan band — indikator kutib
  // turmasdan darhol shu bandga sirpanadi. Pathname o'zgargach o'z-o'zidan
  // eskiradi (from !== pathname).
  const [pending, setPending] = useState<{ key: string; from: string } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const placedOnce = useRef(false);

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

  // Yashil indikator qaysi bandda turishi kerak: avval ichki bandlar
  // (aniq moslik), keyin oddiy bandlar. Kalit — "c:" / "i:" + href.
  let routeKey: string | null = null;
  let routeParent: string | null = null;
  for (const item of filteredNav) {
    const child = item.children?.find((c) => pathname === c.href);
    if (child) {
      routeKey = `c:${child.href}`;
      routeParent = item.href;
      break;
    }
  }
  if (!routeKey) {
    const item = filteredNav.find(
      (i) => !i.children?.length && (isActive(i.href) || (i.matchHrefs?.some(isActive) ?? false))
    );
    if (item) routeKey = `i:${item.href}`;
  }
  const usePending = pending !== null && pending.from === pathname;
  const activeKey = usePending ? pending.key : routeKey;
  const activeParent = usePending
    ? filteredNav.find((i) => i.children?.some((c) => `c:${c.href}` === pending.key))?.href ?? null
    : routeParent;
  // Ichki band yopiq bo'lim ichida bo'lsa — ko'rinmaydi, indikator ham yashiriladi
  const pillHidden =
    !activeKey || (activeParent !== null && (collapsed || !openSections[activeParent]));

  function onNavClick(e: React.MouseEvent, key: string, href: string) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href !== pathname) setPending({ key, from: pathname });
  }

  // Indikatorni faol band ustiga joylashtirish. DOM'ga to'g'ridan-to'g'ri
  // yozamiz (state emas) — har kadrda qayta render bo'lmasin.
  const placePill = useCallback(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const target =
      !pillHidden && activeKey
        ? list.querySelector<HTMLElement>(`[data-pill="${CSS.escape(activeKey)}"]`)
        : null;
    if (!target) {
      pill.style.opacity = "0";
      return;
    }
    const lr = list.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (!placedOnce.current) {
      // Birinchi joylashuv — sirpanmasdan, to'g'ridan-to'g'ri o'z joyida
      pill.style.transition = "none";
    }
    pill.style.transform = `translate(${r.left - lr.left}px, ${r.top - lr.top}px)`;
    pill.style.width = `${r.width}px`;
    pill.style.height = `${r.height}px`;
    pill.style.opacity = "1";
    if (!placedOnce.current) {
      placedOnce.current = true;
      void pill.offsetWidth; // reflow — keyingi o'zgarishlar animatsiyali bo'lsin
      pill.style.transition = "";
    }
  }, [activeKey, pillHidden]);

  useLayoutEffect(() => {
    placePill();
  }, [placePill, collapsed, openSections]);

  // Bo'lim ochilib-yopilganda / sidebar kengligi o'zgarganda bandlar
  // siljiydi — indikator ham ular bilan birga ergashsin.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => placePill());
    ro.observe(list);
    return () => ro.disconnect();
  }, [placePill]);

  return (
    <>
      {/* Mobile hamburger — faqat kichik ekranlarda */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 grid place-items-center rounded-full bg-panel border border-border shadow-sm text-ink"
        aria-label="Menyu"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop mobile drawer ochilganda */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fadeIn"
          aria-hidden
        />
      )}

      {/* Suzuvchi yumaloq panel (Vessa referensi) — desktop'da chetlardan
          12px ichkarida, mobil'da to'liq balandlikdagi drawer. */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen md:left-3 md:top-3 md:h-[calc(100vh-24px)] bg-panel border border-border md:rounded-[28px] shadow-[0_8px_30px_-12px_rgb(var(--c-shadow)/0.14)] flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "w-[76px]" : "w-[248px]",
          // Mobile: drawer sifatida yopiladi/ochiladi
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex items-center h-[76px] shrink-0",
            collapsed ? "flex-col justify-center gap-1 px-0" : "justify-between px-4"
          )}
        >
          <Link href="/" className="flex items-center gap-3 min-w-0 outline-none" aria-label="OneShop ERP">
            <span
              className={cn(
                "shrink-0 rounded-2xl bg-primary text-white grid place-items-center font-black shadow-[0_8px_18px_-8px_var(--c-primary)] transition-all",
                collapsed ? "w-9 h-9 text-base" : "w-11 h-11 text-lg"
              )}
            >
              O
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-[15px] font-bold tracking-tight text-ink leading-tight">
                  OneShop
                </span>
                <span className="block text-xs text-ink-soft leading-tight">
                  ERP tizimi
                </span>
              </span>
            )}
          </Link>
          <div className="flex gap-1">
            {/* Mobile: yopish */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100 text-ink-soft"
              aria-label="Yopish"
            >
              <X size={16} />
            </button>
            {/* Desktop: yig'ish/kengaytirish */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:grid w-7 h-7 place-items-center rounded-full hover:bg-gray-100 text-ink-soft transition"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3">
          <div ref={listRef} className="relative">
            {/* Sirpanuvchi yashil indikator — faol band ostida turadi */}
            <div
              ref={pillRef}
              aria-hidden
              className="absolute left-0 top-0 rounded-full bg-primary shadow-[0_8px_18px_-10px_var(--c-primary)] pointer-events-none opacity-0 transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            />
            {filteredNav.map((item) => {
              const active =
                isActive(item.href) || (item.matchHrefs?.some(isActive) ?? false);
              const hasChildren = !!item.children?.length;
              const isOpen = openSections[item.href];
              const itemKey = `i:${item.href}`;
              const on = activeKey === itemKey;

              return (
                <div key={item.href} className="relative mb-1">
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => toggleSection(item.href)}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          collapsed ? "h-[50px] justify-center" : "px-1.5 py-1.5",
                          active ? "text-ink" : "text-ink-soft hover:text-ink"
                        )}
                      >
                        <span
                          className={cn(
                            "w-9 h-9 shrink-0 rounded-full grid place-items-center transition-colors",
                            active ? "bg-accent-soft text-primary" : "bg-gray-50"
                          )}
                        >
                          <item.icon size={17} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-semibold">
                              {item.label}
                            </span>
                            <ChevronDown
                              size={14}
                              className={cn(
                                "mr-1 transition-transform duration-300 opacity-60",
                                isOpen && "rotate-180"
                              )}
                            />
                          </>
                        )}
                      </button>
                      {/* grid-rows 0fr→1fr — balandlikni silliq ochib-yopish */}
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-300 ease-out",
                          !collapsed && isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="ml-[24px] mt-1 pl-3 border-l border-border space-y-1 pb-1">
                            {item.children!.map((child) => {
                              const childKey = `c:${child.href}`;
                              const childOn = activeKey === childKey;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  data-pill={childKey}
                                  onClick={(e) => onNavClick(e, childKey, child.href)}
                                  className={cn(
                                    "relative flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    childOn
                                      ? "text-white font-semibold"
                                      : "text-ink-soft hover:text-ink hover:bg-gray-50"
                                  )}
                                >
                                  <child.icon size={15} />
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
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      data-pill={collapsed ? undefined : itemKey}
                      onClick={(e) => onNavClick(e, itemKey, item.href)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-full text-sm font-semibold transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        collapsed ? "h-[50px] justify-center" : "px-1.5 py-1.5",
                        on ? "text-white" : "text-ink-soft hover:text-ink hover:bg-gray-50"
                      )}
                    >
                      <span
                        data-pill={collapsed ? itemKey : undefined}
                        className={cn(
                          "shrink-0 rounded-full grid place-items-center transition-all duration-300",
                          on
                            ? collapsed
                              ? "w-11 h-11 text-white"
                              : "w-9 h-9 bg-white/15 text-white"
                            : "w-9 h-9 bg-gray-50"
                        )}
                      >
                        <item.icon size={17} />
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className={cn("shrink-0 p-3 border-t border-border", collapsed && "flex justify-center")}>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className={cn(
                "flex items-center gap-3 rounded-full text-sm font-semibold text-ink-soft hover:text-danger hover:bg-danger/10 transition outline-none focus-visible:ring-2 focus-visible:ring-danger/40",
                collapsed ? "w-11 h-11 justify-center" : "w-full px-1.5 py-1.5"
              )}
              aria-label="Chiqish"
              title="Chiqish"
            >
              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-gray-50">
                <LogOut size={16} />
              </span>
              {!collapsed && <span>Chiqish</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
