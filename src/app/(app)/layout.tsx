import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { getSession } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          name: session.name,
          role: roleLabel[session.role],
        }}
      />
      <Topbar />
      <main className="flex-1 ml-[260px] p-6 md:p-8">{children}</main>
    </div>
  );
}
