import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  // Joriy URL'ning boshqa query parametrlarini saqlab qolish uchun
  buildHref: (page: number) => string;
}

// Raqamli sahifalash — "Yana" (cheksiz yuklash) o'rniga, ma'lumot ko'p
// bo'lganda 1/2/3 ... ko'rinishida sahifa raqamlari + oldinga/orqaga.
export default function Pagination({ page, totalPages, totalCount, pageSize, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // Joriy sahifa atrofida ko'rsatiladigan raqamlar (ko'p bo'lsa "..." bilan)
  const pages: (number | "...")[] = [];
  const windowSize = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= page - windowSize && p <= page + windowSize)
    ) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border flex-wrap">
      <p className="text-xs text-ink-soft">
        Jami <span className="font-semibold text-ink">{totalCount}</span> tadan{" "}
        <span className="font-semibold text-ink">{from}-{to}</span> ko'rsatilmoqda
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={`p-1.5 rounded-lg border border-border ${
            page === 1 ? "opacity-40 pointer-events-none" : "hover:bg-gray-50"
          }`}
        >
          <ChevronLeft size={15} />
        </Link>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-ink-soft text-sm">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className={`min-w-[32px] text-center px-2.5 py-1.5 rounded-lg text-sm font-semibold ${
                p === page
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          )
        )}
        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page === totalPages}
          className={`p-1.5 rounded-lg border border-border ${
            page === totalPages ? "opacity-40 pointer-events-none" : "hover:bg-gray-50"
          }`}
        >
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}
