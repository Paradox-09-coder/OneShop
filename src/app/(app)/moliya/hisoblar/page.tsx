import { redirect } from "next/navigation";

// Hisoblar ro'yxati endi Tranzaksiyalar sahifasida gradient kartalar
// sifatida ko'rsatiladi — alohida sahifa shart emas.
export default function AccountsRedirect() {
  redirect("/moliya/tranzaksiyalar");
}
