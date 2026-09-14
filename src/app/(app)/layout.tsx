import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { getSession } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { allowedHrefs, canAccessPath } from "@/lib/access";
import { Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Route-level guard: joriy pathname (middleware'da o'rnatilgan)
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";

  const hrefs = Array.from(allowedHrefs(session));

  const allowed = canAccessPath(session, pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          name: session.name,
          role: roleLabel[session.role],
        }}
        allowedHrefs={hrefs}
      />
      <main className="flex-1 md:ml-[260px] max-w-full min-h-screen">
        <Topbar />
        {/* pt-[…] — header endi fixed, oqimdan chiqarilgan, shuning uchun
            kontent uning tagida qolib ketmasligi uchun joy qoldiramiz.
            (px/pb alohida yozilgan — p-4/md:p-8 bilan aralashtirilsa,
            Tailwind'da shorthand va pt-* orasidagi tartib buzilib,
            md'da noto'g'ri qiymat qo'llanishi mumkin edi.) */}
        <div className="px-4 pb-4 pt-[72px] md:px-8 md:pb-8 md:pt-[88px]">
          {allowed ? (
            children
          ) : (
            <div className="max-w-md mx-auto mt-20 panel p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-danger-light/40 text-danger grid place-items-center mx-auto mb-4">
                <Ban size={22} />
              </div>
              <h2 className="text-xl font-bold mb-2">Ruxsat yo'q</h2>
              <p className="text-sm text-ink-soft">
                Bu bo'limga sizning rolingizda kirishga ruxsat yo'q. Kerak
                bo'lsa rahbariyat bilan bog'laning.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
