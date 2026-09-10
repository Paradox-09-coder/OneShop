// Telegram Bot webhook — kelayotgan update'larni qabul qiladi.
// Setup: TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET .env'da.
// Webhook o'rnatish: POST /api/telegram/setup

import { prisma } from "@/lib/prisma";
import {
  sendMessage,
  supplierKeyboard,
  clientKeyboard,
  driverKeyboard,
  contactRequestKeyboard,
  escape,
} from "@/lib/telegram";
import { NextResponse } from "next/server";

interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  contact?: {
    phone_number: string;
    first_name?: string;
    last_name?: string;
    user_id?: number;
  };
}

interface Update {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: TelegramMessage;
  };
}

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "").replace(/^998/, "+998");
}

async function findRoleByPhone(phone: string): Promise<{
  role: "SUPPLIER" | "CLIENT" | "DRIVER" | "UNKNOWN";
  counterparty?: { id: string; name: string; type: string };
} | null> {
  const norm = normalizePhone(phone);
  const candidates = [phone, norm, norm.replace("+", "")];

  const cp = await prisma.counterparty.findFirst({
    where: {
      OR: candidates.flatMap((p) => [
        { phone: { contains: p } },
        { phone2: { contains: p } },
      ]),
      deletedAt: null,
    },
  });

  if (!cp) return { role: "UNKNOWN" };

  if (cp.type === "SUPPLIER") return { role: "SUPPLIER", counterparty: cp };
  if (cp.type === "CLIENT") return { role: "CLIENT", counterparty: cp };
  // OTHER type used for drivers in seed
  if (cp.name.toLowerCase().includes("haydovchi") || cp.type === "OTHER")
    return { role: "DRIVER", counterparty: cp };
  return { role: "UNKNOWN", counterparty: cp };
}

async function handleStart(chatId: number, fromName: string) {
  await sendMessage(
    chatId,
    `Assalomu alaykum, <b>${escape(fromName)}</b>!\n\n` +
      `Bu <b>OneShop ERP</b> boti.\n` +
      `Sizni tanish uchun telefon raqamingizni yuboring.`,
    { reply_markup: contactRequestKeyboard }
  );
}

async function handleContact(msg: TelegramMessage) {
  if (!msg.contact) return;
  const phone = msg.contact.phone_number;
  const found = await findRoleByPhone(phone);

  if (!found || found.role === "UNKNOWN") {
    await sendMessage(
      msg.chat.id,
      `Kechirasiz, sizni bazadan topa olmadim.\n` +
        `Telefon: <code>${escape(phone)}</code>\n\n` +
        `Iltimos, bosh ofis bilan bog'laning: <b>+998 71 200 00 00</b>`,
      { reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  // Save telegram_id to counterparty metadata for future use
  if (found.counterparty && msg.from?.id) {
    await prisma.counterparty.update({
      where: { id: found.counterparty.id },
      data: {
        metadata: {
          telegram_id: msg.from.id,
          telegram_username: msg.from.username,
        },
      },
    });
  }

  if (found.role === "SUPPLIER") {
    await sendMessage(
      msg.chat.id,
      `✅ Sizni topdim — <b>${escape(found.counterparty!.name)}</b>\n\n` +
        `Siz <b>ta'minotchi</b>siz.`,
      { reply_markup: supplierKeyboard }
    );
  } else if (found.role === "CLIENT") {
    await sendMessage(
      msg.chat.id,
      `✅ Sizni topdim — <b>${escape(found.counterparty!.name)}</b>\n\n` +
        `Xush kelibsiz, aziz mijoz!`,
      { reply_markup: clientKeyboard }
    );
  } else if (found.role === "DRIVER") {
    await sendMessage(
      msg.chat.id,
      `✅ Sizni topdim — <b>${escape(found.counterparty!.name)}</b>\n\n` +
        `Siz <b>haydovchi</b>siz.`,
      { reply_markup: driverKeyboard }
    );
  }
}

async function handleText(msg: TelegramMessage) {
  const text = msg.text ?? "";
  const chatId = msg.chat.id;

  // Find who this user is by their telegram_id
  const users = await prisma.counterparty.findMany({
    where: { deletedAt: null },
    take: 200,
  });
  const user = users.find(
    (u) =>
      (u.metadata as { telegram_id?: number } | null)?.telegram_id === msg.from?.id
  );

  if (!user) {
    if (text.startsWith("/start")) {
      await handleStart(chatId, msg.from?.first_name ?? "mijoz");
      return;
    }
    await sendMessage(
      chatId,
      "Iltimos, avval /start orqali tanishuv.",
      { reply_markup: contactRequestKeyboard }
    );
    return;
  }

  // Route by role
  if (user.type === "SUPPLIER") {
    if (text.includes("Qarzim")) {
      const balance = user.balanceValue;
      await sendMessage(
        chatId,
        `<b>${escape(user.name)}</b>\n\n` +
          `Sizga qarzimiz: <b>${Math.abs(balance).toLocaleString("ru-RU")} ${user.balanceCurrency}</b>` +
          (balance >= 0 ? " (biz qarzdormiz)" : " (siz qarzdorsiz)")
      );
      return;
    }
    if (text.includes("qabullar") || text.includes("qabul")) {
      const shipments = await prisma.shipment.findMany({
        where: { supplierId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      if (shipments.length === 0)
        return sendMessage(chatId, "Qabullar yo'q");
      const lines = shipments
        .map(
          (s) =>
            `📦 ${escape(s.containerNumber ?? "—")} — ${s.totalCost.toLocaleString("ru-RU")} ${s.currency}`
        )
        .join("\n");
      await sendMessage(chatId, `<b>So'nggi qabullar:</b>\n${lines}`);
      return;
    }
  }

  if (user.type === "CLIENT") {
    if (text.includes("Buyurtma")) {
      const orders = await prisma.order.findMany({
        where: { clientId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      if (orders.length === 0) return sendMessage(chatId, "Buyurtmalar yo'q");
      const lines = orders
        .map(
          (o) =>
            `📋 ${escape(o.orderNumber)} — ${o.status} — ${(o.agreedAmount ?? 0).toLocaleString("ru-RU")} ${o.orderCurrency}`
        )
        .join("\n");
      await sendMessage(chatId, `<b>Buyurtmalaringiz:</b>\n${lines}`);
      return;
    }
    if (text.includes("Qarzim")) {
      const orders = await prisma.order.aggregate({
        where: { clientId: user.id, status: { not: "CANCELLED" } },
        _sum: { agreedAmount: true, paidAmount: true },
      });
      const debt =
        (orders._sum.agreedAmount ?? 0) - (orders._sum.paidAmount ?? 0);
      await sendMessage(
        chatId,
        `<b>${escape(user.name)}</b>\n\n` +
          (debt > 0
            ? `Qarzingiz: <b>${debt.toLocaleString("ru-RU")} ${user.balanceCurrency}</b>`
            : `Qarzingiz yo'q ✓`)
      );
      return;
    }
  }

  if (user.type === "OTHER") {
    if (text.includes("Bugungi") || text.includes("yetkazish")) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const orders = await prisma.order.findMany({
        where: {
          status: "YETKAZILMOQDA",
          expectedDeliveryDate: { gte: today },
        },
        take: 10,
        include: { client: true },
      });
      if (orders.length === 0)
        return sendMessage(chatId, "Bugungi yetkazishlar yo'q");
      const lines = orders
        .map(
          (o) =>
            `🚚 ${escape(o.orderNumber)} — ${escape(o.client?.name ?? "—")}\n` +
            `📍 ${escape(o.deliveryAddress ?? "—")}\n` +
            `📱 ${escape(o.client?.phone ?? "—")}`
        )
        .join("\n\n");
      await sendMessage(chatId, `<b>Bugungi yetkazishlar:</b>\n\n${lines}`);
      return;
    }
  }

  await sendMessage(chatId, "Menyudan tanlang.");
}

export async function POST(req: Request) {
  // Verify webhook secret (if set)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const update: Update = await req.json();

    if (update.message?.contact) {
      await handleContact(update.message);
    } else if (update.message?.text) {
      await handleText(update.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Telegram webhook]", e);
    // Always return 200 to Telegram so it doesn't retry
    return NextResponse.json({ ok: false, error: String(e) });
  }
}

export async function GET() {
  // Health check
  const { isTelegramConfigured } = await import("@/lib/telegram");
  return NextResponse.json({
    configured: isTelegramConfigured(),
    webhook: "/api/telegram/webhook",
  });
}
