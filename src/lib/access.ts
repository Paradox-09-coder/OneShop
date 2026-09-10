// Kimga qaysi bo'lim ko'rinishini boshqarish
// Har bo'lim uchun kerakli ruxsat (permission) — sozlangan.
// Rahbar/Bosh admin doim "*" ga ega — barchasi ochiq.

import type { SessionUser } from "./auth";
import { hasPermission } from "./auth";

// Sidebar menyu = permission
export interface NavGate {
  href: string;
  requires: string;
}

// Sidebar menyu turlarini permissionga bog'lash.
// Format: href → ruxsat (permission)
export const NAV_GATES: NavGate[] = [
  { href: "/", requires: "dashboard.read" },
  { href: "/buyurtmalar", requires: "orders.read" },
  { href: "/pos", requires: "pos.read" },
  { href: "/omborxona", requires: "warehouse.read" },
  { href: "/katalog", requires: "catalog.read" },
  { href: "/filiallar", requires: "warehouse.read" },
  { href: "/xaridlar", requires: "shipments.read" },
  { href: "/mijozlar", requires: "clients.read" },
  { href: "/crm", requires: "crm.read" },
  { href: "/kontragentlar", requires: "counterparties.read" },
  { href: "/moliya", requires: "finance.read" },
  { href: "/moliya/tranzaksiyalar", requires: "finance.read" },
  { href: "/moliya/hisoblar", requires: "finance.read" },
  { href: "/moliya/qarzdorliklar", requires: "finance.read" },
  { href: "/moliya/kalendar", requires: "finance.read" },
  { href: "/xodimlar", requires: "employees.read" },
  { href: "/xodimlar/davomad", requires: "employees.read" },
  { href: "/xodimlar/oylik", requires: "payroll.read" },
  { href: "/hisobotlar", requires: "reports.read" },
  { href: "/sozlamalar", requires: "settings.read" },
];

// Barcha rollar uchun "dashboard.read", "clients.read" va shu kabi ruxsatlar
// alohida yozilmagan — quyidagi funksiya ularni permission wildcard bilan
// tekshiradi.
export function canAccessPath(user: SessionUser, pathname: string): boolean {
  // '*' — bosh admin/rahbar
  if (user.permissions.includes("*")) return true;

  // Aynan mos gate
  const gate = NAV_GATES.find(
    (g) => g.href === pathname || pathname.startsWith(g.href + "/")
  );
  if (!gate) return true; // gate belgilanmagan sahifa — hammaga ochiq

  return hasPermission(user, gate.requires);
}

// Sidebar filter uchun — foydalanuvchiga qaysi hrefs ochiq
export function allowedHrefs(user: SessionUser): Set<string> {
  const set = new Set<string>();
  for (const g of NAV_GATES) {
    if (hasPermission(user, g.requires) || user.permissions.includes("*")) {
      set.add(g.href);
    }
  }
  return set;
}
