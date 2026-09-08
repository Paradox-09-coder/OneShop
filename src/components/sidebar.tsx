"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Package,
  Layers,
  Box,
  AlertTriangle,
  History,
  Factory,
  ClipboardList,
  Scissors,
  Download as DownloadIcon,
  ListTree,
  FileDown,
  FileUp,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  { label: "Главная", href: "/", icon: Home },
  {
    label: "Склад",
    href: "/warehouse",
    icon: Package,
    children: [
      { label: "Сырьё", href: "/warehouse/raw", icon: Layers },
      { label: "Готовая продукция", href: "/warehouse/finished", icon: Box },
      { label: "Мало на складе", href: "/warehouse/low-stock", icon: AlertTriangle, badge: 3 },
      { label: "История обработки", href: "/warehouse/history", icon: History },
    ],
  },
  {
    label: "Производство",
    href: "/production",
    icon: Factory,
    children: [
      { label: "Заказы", href: "/production/orders", icon: ClipboardList },
      { label: "Полуфабрикаты", href: "/production/semi", icon: Scissors },
      { label: "Приёмка", href: "/production/receiving", icon: DownloadIcon },
      { label: "Состав модели", href: "/production/bom", icon: ListTree },
    ],
  },
  { label: "Экспорт", href: "/export", icon: FileDown },
  { label: "Импорт", href: "/import", icon: FileUp },
  { label: "Логи", href: "/logs", icon: ScrollText },
  { label: "Настройки", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "/warehouse": true,
    "/production": true,
  });

  const toggleSection = (href: string) => {
    setOpenSections((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
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
            ISHLAB<br/>CHIQARISH
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openSections[item.href];

          return (
            <div key={item.href} className="mb-0.5">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleSection(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active ? "text-ink" : "text-ink-soft hover:text-ink hover:bg-gray-50"
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
    </aside>
  );
}
