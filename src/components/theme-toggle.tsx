"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Yorug' / qorong'i rejimni almashtirish. Tanlov localStorage'da saqlanadi;
// birinchi chizishdagi holatni app/layout.tsx'dagi inline skript qo'yadi.
//
// Animatsiya: View Transitions API — brauzer eski va yangi ko'rinishning
// suratini oladi, yangisi bosilgan nuqtadan doira bo'lib kengayadi. Har bir
// elementga alohida CSS transition berilmaydi, shuning uchun qotmaydi.
// API yo'q brauzerlarda (yoki "kamroq harakat" sozlamasida) darhol almashadi.

// <html> klassini kuzatamiz — holatning yagona manbai shu klass.
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export default function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    const apply = () => {
      root.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      apply();
      return;
    }

    // Doira markazi — bosilgan nuqta (klaviatura bilan bosilsa, tugma markazi)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;
    // Ekranning eng uzoq burchagigacha bo'lgan masofa — doira hammasini qoplasin
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "relative w-10 h-10 rounded-full border border-border bg-panel grid place-items-center text-ink-soft hover:text-primary hover:border-primary/40 transition-colors overflow-hidden",
        className
      )}
      aria-label={dark ? "Yorug' rejim" : "Qorong'i rejim"}
      title={dark ? "Yorug' rejim" : "Qorong'i rejim"}
    >
      <Sun
        size={18}
        className={cn(
          "absolute transition-all duration-500",
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
      />
      <Moon
        size={18}
        className={cn(
          "absolute transition-all duration-500",
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
    </button>
  );
}
