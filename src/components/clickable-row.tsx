"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

// Butun jadval qatorini bosilganda sahifaga o'tkazadi — faqat ichidagi
// havola/matnga emas. Qator ichida o'z yo'nalishiga ega interaktiv element
// bo'lsa (masalan tel: havolasi), o'shanga alohida onClick bilan
// stopPropagation qo'yish kerak — aks holda ikkalasi ham ishga tushadi.
export default function ClickableRow({ href, className, children }: Props) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(href);
  }

  return (
    <tr onClick={handleClick} className={`cursor-pointer ${className ?? ""}`}>
      {children}
    </tr>
  );
}
