// Next.js server ishga tushganda bir marta chaqiriladi. Shu yerda ichki
// rejalashtiruvchini (juma kuni qarz eslatmasi va h.k.) ishga tushiramiz —
// shunda tashqi cron xizmatiga ehtiyoj qolmaydi.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/jobs/scheduler");
    startScheduler();
  }
}
