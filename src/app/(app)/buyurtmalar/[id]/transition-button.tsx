"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, OrderType } from "@prisma/client";
import { allowedTransitions } from "@/lib/state-machine";
import { orderStatusLabel } from "@/lib/labels";

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  type: OrderType;
}

export default function TransitionButton({ orderId, currentStatus, type }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = allowedTransitions(type, currentStatus);

  async function transition(to: OrderStatus) {
    if (!confirm(`Holat "${orderStatusLabel[to]}" ga o'zgartirilsinmi?`)) return;
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
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (next.length === 0) {
    return (
      <div className="panel p-5">
        <p className="text-sm text-ink-soft">
          Bu holatdan boshqa holatga o'tib bo'lmaydi
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <h3 className="font-bold mb-3">Holatni o'zgartirish</h3>
      <div className="flex flex-col gap-2">
        {next.map((s) => (
          <button
            key={s}
            disabled={loading}
            onClick={() => transition(s)}
            className={`w-full py-2 rounded-xl font-semibold text-sm ${
              s === "CANCELLED"
                ? "border border-danger text-danger hover:bg-danger-light/20"
                : "bg-primary text-white hover:bg-primary-dark"
            } disabled:opacity-50`}
          >
            → {orderStatusLabel[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
