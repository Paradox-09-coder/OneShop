import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  className?: string;
  children: ReactNode;
}

export default function Badge({ className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}
