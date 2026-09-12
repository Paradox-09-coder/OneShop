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
    <div className="flex items-center gap-1 border-b border-border mb-6 -mt-2 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
