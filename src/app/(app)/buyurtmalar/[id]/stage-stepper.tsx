"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, OrderType } from "@prisma/client";
import { allowedTransitions, stagesFor } from "@/lib/state-machine";
import { orderStatusLabel } from "@/lib/labels";
import { useDialog } from "@/components/use-dialog";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  type: OrderType;
}

// Referens dizayndagi kabi — bosqichlar bir qatorda ulangan pill zanjiri.
// Joriy bosqich to'liq rangli, o'tgan bosqichlar yumshoqroq, kelajakdagilar
// kulrang. Ruxsat etilgan (state-machine.ts) qo'shni bosqichni bosish orqali
// o'tkazish qilinadi.
export default function StageStepper({ orderId, currentStatus, type }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { confirm, alert, Dialog } = useDialog();

  const steps = [...stagesFor(type), "CANCELLED" as const];
  const currentIndex = steps.indexOf(currentStatus);
  const allowed = allowedTransitions(type, currentStatus);

  async function transition(to: OrderStatus) {
    const ok = await confirm(`Holat "${orderStatusLabel[to]}" ga o'zgartirilsinmi?`, {
      danger: to === "CANCELLED",
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error?.message ?? "Xato");
        return;
      }
      if (data.data?.shortageWarning) {
        alert(
          `⚠️ Holat o'zgartirildi, lekin xomashyo yetishmaydi:\n\n${data.data.shortageWarning}`
        );
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel p-3 mb-4 flex items-center gap-1 overflow-x-auto">
      {Dialog}
      {steps.map((step, i) => {
        const isCurrent = step === currentStatus;
        const isPast = currentIndex >= 0 && i < currentIndex && step !== "CANCELLED";
        const isClickable = allowed.includes(step) && !loading;
        const isCancel = step === "CANCELLED";
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <button
              disabled={!isClickable}
              onClick={() => isClickable && transition(step)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition",
                isCurrent
                  ? isCancel
                    ? "bg-danger text-white"
                    : "bg-primary text-white"
                  : isPast
                    ? "bg-success-soft text-success"
                    : isCancel
                      ? "text-danger/70 bg-danger-light/10"
                      : "bg-gray-100 text-ink-soft",
                isClickable && !isCurrent && "cursor-pointer hover:ring-2 hover:ring-primary/40",
                !isClickable && !isCurrent && "cursor-default"
              )}
              title={isClickable ? `${orderStatusLabel[step]}ga o'tkazish` : undefined}
            >
              {orderStatusLabel[step]}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="text-ink-soft/40 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
