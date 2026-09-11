"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
  step?: number;
  takeKey?: string;
  hasMore: boolean;
}

// Ro'yxat sahifalarida "Yana N ta" tugmasi — URL'dagi `take`ni oshirib,
// server komponentni qayta so'raydi (Prisma `take` shunga qarab o'sadi).
export default function LoadMore({ step = 30, takeKey = "take", hasMore }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  if (!hasMore) return null;

  function loadMore() {
    const params = new URLSearchParams(sp.toString());
    const current = Number(params.get(takeKey)) || step;
    params.set(takeKey, String(current + step));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="p-4 text-center border-t border-border">
      <button
        onClick={loadMore}
        className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-gray-50"
      >
        Yana {step} ta ko'rsatish
      </button>
    </div>
  );
}
