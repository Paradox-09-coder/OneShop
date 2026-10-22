import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import ThemeToggle from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

// Toshkent vaqti bo'yicha salomlashish (server UTC'da ishlaydi)
function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Tashkent",
    }).format(new Date())
  );
  if (h >= 5 && h < 12) return "Xayrli tong";
  if (h >= 12 && h < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export default async function Topbar() {
  const session = await getSession();
  if (!session) return null;

  const unread = await prisma.notification.count({
    where: {
      OR: [{ userId: null }, { userId: session.id }],
      readAt: null,
    },
  });

  return (
    <header className="fixed top-0 left-0 right-0 md:left-[272px] z-20 h-16 flex items-center justify-end gap-2.5 bg-bg/80 backdrop-blur-md px-4 md:px-8">
      <ThemeToggle />
      <Link
        href="/xabarnomalar"
        className="relative w-10 h-10 rounded-full border border-border bg-panel grid place-items-center text-ink-soft hover:text-primary hover:border-primary/40 transition"
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full grid place-items-center px-1 ring-2 ring-bg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <div className="hidden sm:flex items-center gap-2.5 h-10 pl-1 pr-4 rounded-full border border-border bg-panel">
        <span className="w-8 h-8 rounded-full bg-accent-soft text-primary grid place-items-center text-sm font-bold">
          {session.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] text-ink-soft">{greeting()},</span>
          <span className="block text-[13px] font-semibold text-ink max-w-[160px] truncate">
            {session.name}
            <span className="font-normal text-ink-soft"> · {roleLabel[session.role]}</span>
          </span>
        </span>
      </div>
    </header>
  );
}
