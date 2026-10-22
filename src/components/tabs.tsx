"use client";

import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  value: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
  variant?: "filled" | "outline";
}

export default function Tabs({ tabs, active, onChange, variant = "filled" }: TabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300",
            variant === "filled"
              ? active === tab.value
                ? "bg-primary text-white"
                : "bg-panel border border-border text-ink-soft hover:text-ink hover:border-primary/30"
              : active === tab.value
                ? "bg-primary text-white"
                : "bg-panel border border-border text-ink-soft hover:border-primary/30"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-80">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
