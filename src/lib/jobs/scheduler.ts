// Ichki rejalashtiruvchi — tashqi cron xizmatiga muhtoj bo'lmasin deb,
// server o'zi (doim ishlab turgani uchun) belgilangan vaqtda o'z ichidagi
// vazifalarni chaqiradi. Hozircha: har juma, soat 10:00 (Toshkent vaqti)
// qarzdorlik eslatmasi.
//
// Eslatma: bu — jarayon xotirasidagi oddiy taymer, tashqi cron-service kabi
// kafolatlangan emas (server qayta ishga tushsa, shu daqiqadagi ishga
// tushirish o'tkazib yuborilishi mumkin). Bizning holatimiz uchun — haftada
// bir marta yuboriladigan eslatma — bu yetarli darajada ishonchli.
import { runDebtReminderJob } from "./debt-reminder";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // har 5 daqiqada tekshiradi
let lastRunDateKey: string | null = null;
let started = false;

function tashkentNow() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    weekday: map.weekday, // "Mon".."Sun"
    hour: Number(map.hour),
    minute: Number(map.minute),
    dateKey: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
    }).format(new Date()), // YYYY-MM-DD
  };
}

async function tick() {
  const now = tashkentNow();
  const isFriday10AM = now.weekday === "Fri" && now.hour === 10;
  if (!isFriday10AM) return;
  if (lastRunDateKey === now.dateKey) return; // shu kuni allaqachon ishga tushgan

  lastRunDateKey = now.dateKey;
  try {
    const result = await runDebtReminderJob();
    console.log("[scheduler] debt-reminder ishga tushdi:", result);
  } catch (e) {
    console.error("[scheduler] debt-reminder xato:", e);
  }
}

export function startScheduler() {
  if (started) return; // ikki marta ishga tushmasin
  started = true;
  console.log("[scheduler] ichki rejalashtiruvchi ishga tushdi (har 5 daqiqada tekshiradi)");
  setInterval(() => {
    tick().catch((e) => console.error("[scheduler] tick xato:", e));
  }, CHECK_INTERVAL_MS);
  // Serverning o'zi ochilgan zahoti ham bir marta tekshirib qo'yadi —
  // agar deploy aynan juma 10:00 atrofida bo'lib qolsa, shuni o'tkazib
  // yubormaslik uchun.
  tick().catch((e) => console.error("[scheduler] birinchi tick xato:", e));
}
