import { redirect } from "next/navigation";

// Umumiy ko'rsatkichlar (Jami balans, Kirim/Chiqim, hisoblar) endi
// Tranzaksiyalar sahifasining o'zida — Moliya bitta bo'lim, tablar bilan.
export default function FinanceOverviewRedirect() {
  redirect("/moliya/tranzaksiyalar");
}
