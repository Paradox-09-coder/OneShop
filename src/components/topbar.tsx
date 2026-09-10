import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    <div className="fixed top-2 right-3 md:right-4 flex items-center gap-3 z-20">
      <Link
        href="/xabarnomalar"
        className="relative p-2 rounded-xl bg-white/80 backdrop-blur border border-border hover:bg-white shadow-sm transition"
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        <Bell size={20} className="text-ink-soft" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full grid place-items-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </div>
  );
}
