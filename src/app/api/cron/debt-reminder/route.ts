// Qarzdor mijozlarga eslatma — meeting: "Har juma 10:00 → Qarzdor mijoz →
// Qarz eslatmasi". Bu endpoint o'zi vaqt bo'yicha ishga tushmaydi — buni
// tashqi (yoki Railway) cron tetiklab turishi kerak. CRON_SECRET orqali
// himoyalangan, toki tashqaridan istalgan odam chaqirib yubormasin.
import { prisma } from "@/lib/prisma";
import { jsonErr, jsonOk } from "@/lib/api";
import { sendMessage, sendGroupMessage, escape } from "@/lib/telegram";

interface DriverOrClientMeta {
  telegram_id?: number;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return jsonErr("Ruxsat yo'q", 401);
  }

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
    return jsonOk({ notified: 0, totalDebt: 0 });
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
    const telegramId = (client?.metadata as DriverOrClientMeta | null)
      ?.telegram_id;
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

  return jsonOk({ notified, totalDebtors: debtorIds.length, totalDebt });
}
