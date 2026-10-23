"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

// Sayt yangilanganini (yangi deploy) sezib, tepada chiroyli xabar chiqaradi.
// Sahifa ochilganda hozirgi versiyani eslab oladi; keyin har 45 soniyada va
// oynaga qaytilganda tekshiradi. Versiya o'zgarsa — "Yangilash" tugmali
// xabar. Foydalanuvchi yozayotgan ma'lumot yo'qolmasligi uchun sahifa o'zi
// qayta yuklanmaydi — faqat tugma bosilganda.

const CHECK_EVERY_MS = 45_000;

export default function UpdateBanner() {
  const baseline = useRef<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok || stopped) return; // masalan, sessiya tugagan — jim o'tamiz
        const { version } = (await res.json()) as { version: string };
        if (baseline.current === null) baseline.current = version;
        else if (version !== baseline.current) setLatest(version);
      } catch {
        // tarmoq uzilishi — keyingi safar qayta uriniladi
      }
    }

    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!latest || dismissed === latest) return null;

  function refresh() {
    setReloading(true);
    // Tugma aylanishi ko'rinib qolsin, keyin qayta yuklaymiz
    window.setTimeout(() => window.location.reload(), 450);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 z-[70] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2"
    >
      <div className="update-banner relative overflow-hidden rounded-3xl border border-primary/30 bg-panel shadow-[0_18px_50px_-18px_rgb(var(--c-shadow)/0.45)]">
        {/* yumshoq gradient fon */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent" />

        <div className="relative flex items-center gap-3.5 p-3.5 pr-3">
          <div className="relative shrink-0">
            <span className="update-pulse absolute inset-0 rounded-2xl bg-primary/40" />
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white shadow-md">
              <Sparkles size={20} className="update-sparkle" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink leading-tight">
              Saytga yangi narsa qo&apos;shildi! 🎉
            </p>
            <p className="mt-0.5 text-xs text-ink-soft leading-snug">
              Yangilanishni olish uchun sahifani yangilang. Yozayotgan
              ma&apos;lumotingiz bo&apos;lsa, avval saqlab oling.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={refresh}
              disabled={reloading}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_var(--c-primary)] transition hover:bg-primary-dark active:scale-95 disabled:opacity-80"
            >
              <RefreshCw size={15} className={reloading ? "animate-spin" : ""} />
              Yangilash
            </button>
            <button
              type="button"
              onClick={() => setDismissed(latest)}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-gray-100 hover:text-ink"
              aria-label="Keyinroq"
              title="Keyinroq"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* pastda oqib turuvchi chiziq */}
        <div className="update-shimmer h-[3px] w-full" />
      </div>
    </div>
  );
}
