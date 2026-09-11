// Telegram Bot webhook — kelayotgan update'larni qabul qiladi.
// Setup: TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET .env'da.
// Webhook o'rnatish: POST /api/telegram/setup

import { prisma } from "@/lib/prisma";
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  supplierKeyboard,
  clientKeyboard,
  driverKeyboard,
  contactRequestKeyboard,
  escape,
} from "@/lib/telegram";
import { stagesFor } from "@/lib/state-machine";
import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";

// Savdo (retail/wholesale) buyurtmalari "Yetkazilmoqda"ga, ishlab chiqarish
// buyurtmalari esa "Tayyor"ga yetganda haydovchiga topshiriladi — ikkala
// bosqich ham "hali yetkazilmagan, lekin haydovchiga tayyor" degani.
const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = ["YETKAZILMOQDA", "READY"];
const DELIVERED_STATUSES: OrderStatus[] = ["YAKUNLANDI", "DELIVERED"];

// Aniq GPS koordinata bazada yo'q — "Manzil" oddiy matn maydoni. Agar shu
// maydonga tayyor Google Maps (yoki boshqa) havola qo'yilgan bo'lsa (masalan,
// mijoz Telegram'da joylashuvini yuborgan, sotuvchi o'sha havolani nusxalab
// shu yerga qo'ygan bo'lsa) — uni o'zgartirmasdan ishlatamiz, chunki u aniq
// nuqtaga ishora qiladi. Aks holda matn bo'yicha Maps qidiruviga tushamiz.
function mapsLink(address: string): string {
  const trimmed = address.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

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

// Telegram klaviaturasi qurilmada saqlanib qoladi — bot yangilansa ham,
// bot yangi reply_markup yubormaguncha eski tugmalar ko'rinib turadi.
// Shuning uchun har bir javobga joriy rolga mos klaviaturani qayta
// biriktiramiz — shu bilan u o'z-o'zidan yangilanib boradi.
function keyboardFor(type: string) {
  if (type === "SUPPLIER") return supplierKeyboard;
  if (type === "CLIENT") return clientKeyboard;
  if (type === "OTHER") return driverKeyboard;
  return undefined;
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

interface DriverOrClientMeta {
  telegram_id?: number;
  telegram_username?: string;
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
      (u.metadata as DriverOrClientMeta | null)?.telegram_id === msg.from?.id
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

  const kb = keyboardFor(user.type);

  if (
    text.includes("Bosh ofis") ||
    text.includes("Rahbariyat") ||
    text.includes("Menejer bilan")
  ) {
    await sendMessage(chatId, "☎️ Bosh ofis: <b>+998 71 200 00 00</b>", {
      reply_markup: kb,
    });
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
          (balance >= 0 ? " (biz qarzdormiz)" : " (siz qarzdorsiz)"),
        { reply_markup: kb }
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
        return sendMessage(chatId, "Qabullar yo'q", { reply_markup: kb });
      const lines = shipments
        .map(
          (s) =>
            `📦 ${escape(s.containerNumber ?? "—")} — ${s.totalCost.toLocaleString("ru-RU")} ${s.currency}`
        )
        .join("\n");
      await sendMessage(chatId, `<b>So'nggi qabullar:</b>\n${lines}`, {
        reply_markup: kb,
      });
      return;
    }
  }

  if (user.type === "CLIENT") {
    if (text.includes("Buyurtmalarim")) {
      const orders = await prisma.order.findMany({
        where: { clientId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      if (orders.length === 0)
        return sendMessage(chatId, "Buyurtmalar yo'q", { reply_markup: kb });
      const lines = orders
        .map(
          (o) =>
            `📋 ${escape(o.orderNumber)} — ${o.status} — ${(o.agreedAmount ?? 0).toLocaleString("ru-RU")} ${o.orderCurrency}`
        )
        .join("\n");
      await sendMessage(chatId, `<b>Buyurtmalaringiz:</b>\n${lines}`, {
        reply_markup: kb,
      });
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
            : `Qarzingiz yo'q ✓`),
        { reply_markup: kb }
      );
      return;
    }
  }

  if (user.type === "OTHER") {
    if (text.includes("Bugungi") || text.includes("yetkazish")) {
      await sendDeliveryList(chatId, user, kb);
      return;
    }

    if (text.includes("Yetkazdim")) {
      await sendMessage(
        chatId,
        "Qaysi buyurtmani yetkazganingizni belgilash uchun " +
          "«📋 Bugungi yetkazishlar»ni oching — har bir buyurtma tagida " +
          "o'zining «✅ Yetkazdim» tugmasi bor.",
        { reply_markup: kb }
      );
      return;
    }

    if (text.includes("Yo'l kira") || text.includes("Yol kira")) {
      const driverPhoneNorm = normalizePhone(user.phone ?? "");
      const recent = await prisma.order.findMany({
        where: {
          status: { in: [...ACTIVE_DELIVERY_STATUSES, ...DELIVERED_STATUSES] },
          driverPhone: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      const mine = recent.filter(
        (o) => o.driverPhone && normalizePhone(o.driverPhone) === driverPhoneNorm
      );
      if (mine.length === 0)
        return sendMessage(chatId, "Sizga biriktirilgan yo'l kira topilmadi", {
          reply_markup: kb,
        });

      const total = mine.reduce((s, o) => s + (o.deliveryCost ?? 0), 0);
      const paid = mine
        .filter((o) => o.deliveryPaidAt)
        .reduce((s, o) => s + (o.deliveryCost ?? 0), 0);
      const unpaid = total - paid;
      const lines = mine
        .slice(0, 10)
        .map(
          (o) =>
            `${o.deliveryPaidAt ? "✅" : "⏳"} ${escape(o.orderNumber)} — ${(o.deliveryCost ?? 0).toLocaleString("ru-RU")} so'm` +
            (o.deliveryPaidAt ? "" : " (to'lanmagan)")
        )
        .join("\n");
      await sendMessage(
        chatId,
        `<b>Yo'l kira hisobingiz</b>\n\n` +
          `Jami belgilangan: <b>${total.toLocaleString("ru-RU")} so'm</b>\n` +
          `To'langan: ${paid.toLocaleString("ru-RU")} so'm\n` +
          `Qolgan (to'lanmagan): <b>${unpaid.toLocaleString("ru-RU")} so'm</b>\n\n` +
          `${lines}`,
        { reply_markup: kb }
      );
      return;
    }
  }

  await sendMessage(chatId, "Menyudan tanlang.", { reply_markup: kb });
}

async function sendDeliveryList(
  chatId: number,
  driver: { phone: string | null },
  kb?: ReturnType<typeof keyboardFor>
) {
  // Faqat SHU haydovchiga biriktirilgan yetkazishlar — telefon bo'yicha.
  // Sana filtri qo'llanilmaydi: yetkazish kechikkan bo'lsa ham (rejalashtirilgan
  // sana o'tib ketgan bo'lsa ham), u hali "Yetkazilmoqda" holatida ekan —
  // botdan g'oyib bo'lmasligi kerak.
  const driverPhoneNorm = normalizePhone(driver.phone ?? "");
  const allActive = await prisma.order.findMany({
    where: { status: { in: ACTIVE_DELIVERY_STATUSES } },
    orderBy: [{ expectedDeliveryDate: "asc" }],
    take: 50,
    include: { client: true },
  });
  const orders = allActive.filter(
    (o) => o.driverPhone && normalizePhone(o.driverPhone) === driverPhoneNorm
  );
  if (orders.length === 0) {
    await sendMessage(chatId, "Sizga biriktirilgan yetkazishlar yo'q", {
      reply_markup: kb,
    });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await sendMessage(chatId, `<b>Yetkazishlaringiz (${orders.length}):</b>`, {
    reply_markup: kb,
  });

  // Har bir buyurtma — alohida xabar, o'zining "Yetkazdim" tugmasi bilan
  // (bitta umumiy tugma qaysi buyurtmaga tegishli ekanini bildirmasdi).
  for (const o of orders) {
    const overdue = o.expectedDeliveryDate && o.expectedDeliveryDate < today;
    const address = o.deliveryAddress || "—";
    const text =
      `${overdue ? "⚠️ KECHIKMOQDA" : "🚚"} <b>${escape(o.orderNumber)}</b>\n` +
      `👤 ${escape(o.client?.name ?? "—")}\n` +
      `📍 <a href="${mapsLink(address)}">${escape(address)}</a>\n` +
      `📱 ${escape(o.client?.phone ?? "—")}`;
    await sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Yetkazdim", callback_data: `deliver:${o.id}` }],
        ],
      },
    });
  }
}

async function handleCallback(query: NonNullable<Update["callback_query"]>) {
  const data = query.data ?? "";
  const [action, orderId] = data.split(":");
  if (action !== "deliver" || !orderId) {
    await answerCallbackQuery(query.id);
    return;
  }

  const users = await prisma.counterparty.findMany({
    where: { deletedAt: null, type: "OTHER" },
    take: 200,
  });
  const driver = users.find(
    (u) =>
      (u.metadata as { telegram_id?: number } | null)?.telegram_id ===
      query.from.id
  );
  if (!driver) {
    await answerCallbackQuery(query.id, "Siz haydovchi sifatida topilmadingiz");
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const driverPhoneNorm = normalizePhone(driver.phone ?? "");
  if (
    !order ||
    !order.driverPhone ||
    normalizePhone(order.driverPhone) !== driverPhoneNorm
  ) {
    await answerCallbackQuery(query.id, "Bu buyurtma sizga tegishli emas");
    return;
  }
  if (!ACTIVE_DELIVERY_STATUSES.includes(order.status)) {
    await answerCallbackQuery(query.id, "Bu buyurtma allaqachon yakunlangan");
    return;
  }

  // Savdo buyurtmasi uchun keyingi bosqich "Yakunlandi", ishlab chiqarish
  // buyurtmasi uchun "Yetkazildi" — ikkalasi ham o'sha pipeline'ning
  // "topshirildi" bosqichi, shuning uchun holat grafigidan olinadi.
  const flow = stagesFor(order.type);
  const nextStatus = flow[flow.indexOf(order.status) + 1] as OrderStatus;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus, deliveredAt: new Date() },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: nextStatus,
        changedById: `telegram:${driver.id}`,
        reason: "Haydovchi botda \"Yetkazdim\" tugmasini bosdi",
      },
    }),
  ]);

  await answerCallbackQuery(query.id, "✅ Yetkazildi deb belgilandi!");
  if (query.message) {
    await editMessageText(
      query.message.chat.id,
      query.message.message_id,
      `✅ <b>YETKAZILDI</b> — ${escape(order.orderNumber)}`,
      { reply_markup: { inline_keyboard: [] } }
    );
  }
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
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
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
