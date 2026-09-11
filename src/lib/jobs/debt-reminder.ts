// Qarzdor mijozlarga eslatma — meeting: "Har juma 10:00 → Qarzdor mijoz →
// Qarz eslatmasi". Bu funksiya ikki joydan chaqiriladi: ichki
// rejalashtiruvchi (src/lib/jobs/scheduler.ts, har juma 10:00'da o'zi) va
// /api/cron/debt-reminder (qo'lda yoki tashqi tekshirish uchun, ixtiyoriy).
import { prisma } from "@/lib/prisma";
import { sendMessage, sendGroupMessage, escape } from "@/lib/telegram";

interface ClientMeta {
  telegram_id?: number;
}

export interface DebtReminderResult {
  notified: number;
  totalDebtors: number;
  totalDebt: number;
}

export async function runDebtReminderJob(): Promise<DebtReminderResult> {
  const debts = await prisma.order.groupBy({
    by: ["clientId"],
    where: { status: { not: "CANCELLED" }, clientId: { not: null } },
    _sum: { agreedAmount: true, paidAmount: true },
  });

  const debtorIds = debts
    .map((d) => ({
      clientId: d.clientId as string,
      debt: (d._sum.agreedAmount ?? 0) - (d._sum.paidAmount ?? 0),
    }))
    .filter((d) => d.debt > 0);

  if (debtorIds.length === 0) {
    return { notified: 0, totalDebtors: 0, totalDebt: 0 };
  }

  const clients = await prisma.counterparty.findMany({
    where: { id: { in: debtorIds.map((d) => d.clientId) }, deletedAt: null },
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  let notified = 0;
  let totalDebt = 0;
  for (const { clientId, debt } of debtorIds) {
    totalDebt += debt;
    const client = clientMap.get(clientId);
    const telegramId = (client?.metadata as ClientMeta | null)?.telegram_id;
    if (!client || !telegramId) continue;
    await sendMessage(
      telegramId,
      `🔔 <b>Qarz eslatmasi</b>\n\n` +
        `Hurmatli ${escape(client.name)}, joriy qarzingiz:\n` +
        `<b>${debt.toLocaleString("ru-RU")} ${client.balanceCurrency}</b>`
    ).catch(() => {});
    notified += 1;
  }

  await sendGroupMessage(
    `🔔 <b>Haftalik qarz eslatmasi yuborildi</b>\n` +
      `${notified} ta mijozga xabar ketdi (jami qarzdorlar: ${debtorIds.length} ta)\n` +
      `Jami qarz: ${totalDebt.toLocaleString("ru-RU")} so'm`
  ).catch(() => {});

  return { notified, totalDebtors: debtorIds.length, totalDebt };
}
