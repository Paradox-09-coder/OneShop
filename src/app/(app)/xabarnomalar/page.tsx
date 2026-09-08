import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/page-header";
import { getSession } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  const session = await getSession();
  const notifs = await prisma.notification.findMany({
    where: {
      OR: [{ userId: null }, { userId: session?.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader title="Bildirishnomalar" />
      <div className="panel overflow-hidden">
        {notifs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-ink-soft mb-4">
              <Bell size={24} />
            </div>
            <h3 className="font-semibold">Bildirishnoma yo'q</h3>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`p-4 flex items-start gap-3 ${
                  !n.readAt ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    n.type === "DANGER"
                      ? "bg-danger"
                      : n.type === "WARNING"
                        ? "bg-warning"
                        : n.type === "SUCCESS"
                          ? "bg-success"
                          : "bg-info"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{n.title}</p>
                  {n.body && (
                    <p className="text-sm text-ink-soft mt-0.5">{n.body}</p>
                  )}
                  <p className="text-xs text-ink-soft mt-1">
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
