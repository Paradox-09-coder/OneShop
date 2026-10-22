"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
}

// Sahifa ichidagi tab-navigatsiya — masalan Omborxona/Katalog/Konteynerlar
// bir-biriga bog'liq bo'limlar orasida, sidebar'da alohida daraxt sifatida
// emas, shu sahifaning o'zida tab bo'lib almashadi.
export default function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    // Vessa uslubidagi "pill" segment: oq konteyner ichida faol tab to'q rangda
    <div className="inline-flex max-w-full items-center gap-1 p-1 mb-6 -mt-2 rounded-full bg-panel border border-border overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300",
              active
                ? "bg-primary text-white shadow-[0_6px_14px_-8px_var(--c-primary)]"
                : "text-ink-soft hover:text-ink hover:bg-gray-50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
