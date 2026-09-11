// Qarzdorlik eslatmasini qo'lda (yoki tashqi tekshirish uchun) ishga
// tushirish. Haftalik avtomatik yuborish endi ichki rejalashtiruvchi orqali
// bo'ladi (src/lib/jobs/scheduler.ts) — bu route shunchaki qo'shimcha,
// zarur bo'lsa qo'lda tekshirish uchun. CRON_SECRET orqali himoyalangan.
import { jsonErr, jsonOk } from "@/lib/api";
import { runDebtReminderJob } from "@/lib/jobs/debt-reminder";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return jsonErr("Ruxsat yo'q", 401);
  }

  const result = await runDebtReminderJob();
  return jsonOk(result);
}
