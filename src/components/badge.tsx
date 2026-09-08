"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "danger" | "warning" | "outline";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-gray-100 text-ink-soft",
  primary: "bg-primary/10 text-primary",
  success: "bg-green-50 text-green-700",
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-700",
  outline: "bg-white border border-border text-ink-soft",
};

export default function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        variants[variant],
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {children}
    </span>
  );
}
