// Telegram Bot Client — Bot API orqali sendMessage, editMessageText, etc.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API_BASE = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";

export function isTelegramConfigured() {
  return !!TOKEN;
}

const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID ?? "";

export function isGroupConfigured() {
  return !!GROUP_CHAT_ID;
}

// Umumiy Telegram guruhga avtomatik xabar — zakaz tayyor, yetkazildi,
// xomashyo yetmadi va h.k. GROUP_CHAT_ID hali sozlanmagan bo'lsa, jim
// o'tkazib yuboradi (xato tashlamaydi) — sozlanmagunча boshqa funksiyalar
// ishlashiga to'sqinlik qilmasin.
export async function sendGroupMessage(text: string) {
  if (!GROUP_CHAT_ID) return;
  await sendMessage(GROUP_CHAT_ID, text);
}

async function call(method: string, body: Record<string, unknown>) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description ?? "unknown"}`);
  return data.result;
}

export function sendMessage(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>
) {
  return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

export function sendPhoto(
  chatId: number | string,
  photo: string,
  caption?: string
) {
  return call("sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
  });
}

export function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  extra?: Record<string, unknown>
) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

/**
 * Telegram'ga yuklangan faylni (masalan ovozli xabar) yuklab olib, Buffer
 * qilib qaytaradi — Gemini'ga yuborish uchun.
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const file = await call("getFile", { file_id: fileId });
  const filePath = file.file_path as string;
  const res = await fetch(
    `https://api.telegram.org/file/bot${TOKEN}/${filePath}`
  );
  if (!res.ok) throw new Error(`Faylni yuklab bo'lmadi: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function setWebhook(url: string, secretToken?: string) {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query", "contact"],
  });
}

export function getWebhookInfo() {
  return call("getWebhookInfo", {});
}

// Shared inline keyboards
// Eslatma: "Hisob-kitobimiz" (mijoznikidan farqli) — chunki odatiy holatda
// TA'MINOTCHI emas, BIZ unga qarzdor bo'lamiz (undan tovar olamiz). "Qarzim
// qancha?" degan nom ta'minotchi uchun teskari eshitiladi.
export const supplierKeyboard = {
  keyboard: [
    [{ text: "📊 Hisob-kitobimiz" }, { text: "📦 Oxirgi qabullar" }],
    [{ text: "💰 To'lovlar tarixi" }, { text: "☎️ Rahbariyat" }],
  ],
  resize_keyboard: true,
};

export const clientKeyboard = {
  keyboard: [
    [{ text: "🛒 Buyurtmalarim" }, { text: "💳 Qarzim qancha?" }],
    [{ text: "📦 Yangi buyurtma" }, { text: "☎️ Menejer bilan bog'lanish" }],
  ],
  resize_keyboard: true,
};

// "Yetkazdim" bu yerda yo'q — u har bir buyurtma kartochkasi ostida
// alohida (inline) tugma sifatida chiqadi, chunki qaysi buyurtmaga
// tegishli ekanini bildirish kerak (bitta umumiy tugma buni bilolmaydi).
export const driverKeyboard = {
  keyboard: [
    [{ text: "📋 Bugungi yetkazishlar" }],
    [{ text: "💰 Yo'l kira" }, { text: "☎️ Bosh ofis" }],
  ],
  resize_keyboard: true,
};

export const contactRequestKeyboard = {
  keyboard: [
    [{ text: "📱 Telefon raqamimni yuborish", request_contact: true }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

// Escape HTML in messages so " < > & " are safe
export function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
