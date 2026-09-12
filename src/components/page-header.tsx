"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /**
   * true (default) = "/" ga (Bosh sahifa) o'tadi
   * string        = shu href'ga o'tadi
   * false         = tugma ko'rsatilmaydi
   */
  back?: boolean | string;
}

export default function PageHeader({ title, subtitle, actions, back = true }: Props) {
  const router = useRouter();

  function onBackClick() {
    // Brauzer tarixi orqali qaytamiz — shunda ro'yxat sahifasidagi
    // filtr/sahifalash (?take=...) va scroll pozitsiyasi saqlanib qoladi.
    // To'g'ridan-to'g'ri havola orqali (masalan Telegramdan) ochilgan
    // bo'lsa, tarix bo'lmaydi — o'shanda belgilangan manzilga o'tamiz.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(typeof back === "string" ? back : "/");
  }

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {back && (
            <button
              onClick={onBackClick}
              className="mt-1 p-2 rounded-xl border border-border bg-white hover:bg-gray-50 text-ink-soft"
              title="Orqaga"
              aria-label="Orqaga"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2 items-center">{actions}</div>}
      </div>
    </div>
  );
}
