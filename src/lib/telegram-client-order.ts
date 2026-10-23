// Mijoz botdan buyurtma beradi: katalog → savat → manzil → tasdiqlash.
//
// Faqat CLIENT roli uchun. Savat mijoz kartochkasidagi metadata.order_draft
// ichida saqlanadi (alohida jadval/migratsiya kerak emas). Buyurtma
// /api/orders bilan bir xil qoidalar bo'yicha yaratiladi: narx serverda
// katalogdan olinadi (mijoz o'zgartira olmaydi), kredit limiti tekshiriladi.

import type { Counterparty, Prisma, UnitType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  sendGroupMessage,
  clientKeyboard,
  escape,
} from "@/lib/telegram";
import { generateOrderNumber } from "@/lib/utils";

const PAGE_SIZE = 8;
const MAX_QTY = 1_000_000;

interface Draft {
  items: { pid: string; qty: number }[];
  step: "qty" | "address" | null;
  pending?: string;
  address?: string | null;
}

interface ClientMeta {
  telegram_id?: number;
  telegram_username?: string;
  awaiting_order_request?: boolean;
  order_draft?: Draft | null;
}

interface CallbackQuery {
  id: string;
  from: { id: number };
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

type Target = { chatId: number; messageId?: number };
type Markup = { inline_keyboard: { text: string; callback_data: string }[][] };

// Faqat sotiladigan, narxi so'mda belgilangan faol mahsulotlar. Narxi yo'q
// yoki boshqa valyutadagi mahsulotni mijoz o'zi buyurtma qila olmaydi —
// u menejer bilan kelishiladi.
const SELLABLE: Prisma.CatalogProductWhereInput = {
  status: "active",
  isSellable: true,
  basePrice: { gt: 0 },
  basePriceCurrency: "UZS",
};

const UNIT_LABEL: Record<UnitType, string> = {
  DONA: "dona",
  METR: "metr",
  M2: "m²",
  MM: "mm",
  KG: "kg",
  LITR: "litr",
};

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} so'm`;
const qtyText = (n: number) => String(Number.isInteger(n) ? n : +n.toFixed(3));

// Ikki marta bosilgan "Yuborish" bitta buyurtma bo'lib qolishi uchun
const submitting = new Set<string>();

// ───────────────────────── yordamchilar ─────────────────────────

async function getDraft(clientId: string): Promise<Draft> {
  const c = await prisma.counterparty.findUnique({
    where: { id: clientId },
    select: { metadata: true },
  });
  const d = (c?.metadata as ClientMeta | null)?.order_draft;
  return d && Array.isArray(d.items) ? d : { items: [], step: null };
}

async function saveDraft(clientId: string, draft: Draft | null) {
  const c = await prisma.counterparty.findUnique({
    where: { id: clientId },
    select: { metadata: true },
  });
  const meta = { ...((c?.metadata as ClientMeta | null) ?? {}) };
  meta.order_draft = draft;
  meta.awaiting_order_request = false;
  await prisma.counterparty.update({
    where: { id: clientId },
    data: { metadata: meta as Prisma.InputJsonValue },
  });
}

async function show(t: Target, text: string, markup?: Markup) {
  if (t.messageId) {
    try {
      await editMessageText(t.chatId, t.messageId, text, {
        reply_markup: markup ?? { inline_keyboard: [] },
      });
      return;
    } catch (e) {
      if (String(e).includes("not modified")) return;
    }
  }
  await sendMessage(t.chatId, text, markup ? { reply_markup: markup } : undefined);
}

type Product = Awaited<ReturnType<typeof loadProducts>>[number];

async function loadProducts(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.catalogProduct.findMany({
    where: { id: { in: ids }, ...SELLABLE },
    select: { id: true, name: true, basePrice: true, unitType: true },
  });
}

// Savatni hozirgi katalog bilan solishtirib qaytaradi (mahsulot o'chirilgan
// yoki sotuvdan olingan bo'lsa — savatdan tushib qoladi).
async function cartLines(draft: Draft) {
  const products = await loadProducts(draft.items.map((i) => i.pid));
  const byId = new Map<string, Product>(products.map((p) => [p.id, p]));
  return draft.items
    .map((i) => {
      const p = byId.get(i.pid);
      if (!p) return null;
      const price = p.basePrice ?? 0;
      return { pid: p.id, name: p.name, unit: p.unitType, qty: i.qty, price, sum: price * i.qty };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

function cartText(lines: Awaited<ReturnType<typeof cartLines>>, address?: string | null) {
  const body = lines
    .map(
      (l, i) =>
        `${i + 1}. <b>${escape(l.name)}</b>\n    ${qtyText(l.qty)} ${UNIT_LABEL[l.unit]} × ${money(l.price)} = <b>${money(l.sum)}</b>`
    )
    .join("\n");
  const total = lines.reduce((s, l) => s + l.sum, 0);
  return (
    `🛒 <b>Savatingiz</b>\n\n${body}\n\n💰 Jami: <b>${money(total)}</b>` +
    (address !== undefined ? `\n📍 Manzil: ${address ? escape(address) : "keyinroq aytaman"}` : "")
  );
}

// ───────────────────────── ekranlar ─────────────────────────

async function showCategories(t: Target, draft: Draft) {
  const groups = await prisma.catalogProduct.groupBy({
    by: ["categoryId"],
    where: SELLABLE,
    _count: true,
  });
  if (groups.length === 0) {
    await show(t, "Hozircha buyurtma berish uchun mahsulotlar yo'q. Menejer bilan bog'laning.");
    return;
  }
  // Bitta kategoriya bo'lsa — tanlatib o'tirmaymiz
  if (groups.length === 1) {
    await showProducts(t, draft, groups[0].categoryId ?? "_", 0);
    return;
  }
  const cats = await prisma.productCategory.findMany({
    where: { id: { in: groups.map((g) => g.categoryId).filter((x): x is string => !!x) } },
    orderBy: { sortOrder: "asc" },
  });
  const rows = cats.map((c) => [
    {
      text: `${c.name} (${groups.find((g) => g.categoryId === c.id)?._count ?? 0})`.slice(0, 60),
      callback_data: `co:l:${c.id}:0`,
    },
  ]);
  if (groups.some((g) => g.categoryId === null)) {
    rows.push([{ text: "Boshqa", callback_data: "co:l:_:0" }]);
  }
  rows.push([
    { text: `🛒 Savat (${draft.items.length})`, callback_data: "co:cart" },
    { text: "✍️ Matn bilan yozish", callback_data: "co:free" },
  ]);
  await show(t, "📦 <b>Kategoriyani tanlang</b>", { inline_keyboard: rows });
}

async function showProducts(t: Target, draft: Draft, cat: string, page: number) {
  const where: Prisma.CatalogProductWhereInput = {
    ...SELLABLE,
    ...(cat === "_" ? { categoryId: null } : cat === "all" ? {} : { categoryId: cat }),
  };
  const [total, products] = await Promise.all([
    prisma.catalogProduct.count({ where }),
    prisma.catalogProduct.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, basePrice: true, unitType: true },
    }),
  ]);
  const rows = products.map((p) => [
    {
      text: `${p.name} — ${money(p.basePrice ?? 0)}`.slice(0, 60),
      callback_data: `co:p:${p.id}`,
    },
  ]);
  const nav: { text: string; callback_data: string }[] = [];
  if (page > 0) nav.push({ text: "⬅️", callback_data: `co:l:${cat}:${page - 1}` });
  if ((page + 1) * PAGE_SIZE < total) nav.push({ text: "➡️", callback_data: `co:l:${cat}:${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([
    { text: `🛒 Savat (${draft.items.length})`, callback_data: "co:cart" },
    { text: "⬅️ Kategoriyalar", callback_data: "co:cat" },
  ]);
  rows.push([{ text: "✍️ Matn bilan yozish", callback_data: "co:free" }]);
  await show(t, `📦 <b>Mahsulotni tanlang</b>  (${total} ta)`, { inline_keyboard: rows });
}

async function showCart(t: Target, client: Counterparty, draft: Draft) {
  const lines = await cartLines(draft);
  if (lines.length === 0) {
    await saveDraft(client.id, { items: [], step: null });
    await show(t, "🛒 Savatingiz bo'sh.", {
      inline_keyboard: [[{ text: "➕ Mahsulot tanlash", callback_data: "co:cat" }]],
    });
    return;
  }
  const rows = lines.map((l, i) => [
    { text: `❌ ${i + 1}. ${l.name}`.slice(0, 60), callback_data: `co:rm:${l.pid}` },
  ]);
  rows.push([
    { text: "➕ Yana qo'shish", callback_data: "co:cat" },
    { text: "🗑 Tozalash", callback_data: "co:clr" },
  ]);
  rows.push([{ text: "✅ Davom etish", callback_data: "co:go" }]);
  await show(t, cartText(lines), { inline_keyboard: rows });
}

async function showConfirm(t: Target, client: Counterparty, draft: Draft) {
  const lines = await cartLines(draft);
  if (lines.length === 0) return showCart(t, client, draft);
  await show(
    t,
    cartText(lines, draft.address ?? null) + "\n\nBuyurtmani yuboraylikmi?",
    {
      inline_keyboard: [
        [{ text: "✅ Buyurtmani yuborish", callback_data: "co:ok" }],
        [
          { text: "✏️ Savatni o'zgartirish", callback_data: "co:cart" },
          { text: "❌ Bekor qilish", callback_data: "co:x" },
        ],
      ],
    }
  );
}

// ───────────────────────── kirish nuqtalari ─────────────────────────

/** "📦 Yangi buyurtma" tugmasi bosilganda. */
export async function startClientOrder(chatId: number, client: Counterparty) {
  const draft = await getDraft(client.id);
  draft.step = null;
  draft.pending = undefined;
  await saveDraft(client.id, draft);
  await showCategories({ chatId }, draft);
}

/**
 * Savat jarayonida yozilgan matn (miqdor yoki manzil). Matn shu jarayonga
 * tegishli bo'lsa true qaytaradi — chaqiruvchi boshqa ishlov bermasin.
 */
export async function handleClientOrderText(
  chatId: number,
  client: Counterparty,
  text: string
): Promise<boolean> {
  const draft = await getDraft(client.id);
  if (draft.step === "qty" && draft.pending) {
    const [p] = await loadProducts([draft.pending]);
    if (!p) {
      draft.step = null;
      await saveDraft(client.id, draft);
      await sendMessage(chatId, "Bu mahsulot endi sotuvda yo'q. Boshqasini tanlang.");
      await showCategories({ chatId }, draft);
      return true;
    }
    const qty = Number(text.trim().replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY || (p.unitType === "DONA" && !Number.isInteger(qty))) {
      await sendMessage(
        chatId,
        p.unitType === "DONA"
          ? "Iltimos, butun son yozing (masalan: <b>5</b>)."
          : "Iltimos, son yozing (masalan: <b>2.5</b>)."
      );
      return true;
    }
    await addToCart(client, draft, p.id, qty);
    await showCart({ chatId }, client, await getDraft(client.id));
    return true;
  }
  if (draft.step === "address") {
    draft.address = text.trim().slice(0, 300);
    draft.step = null;
    await saveDraft(client.id, draft);
    await showConfirm({ chatId }, client, draft);
    return true;
  }
  return false;
}

async function addToCart(client: Counterparty, draft: Draft, pid: string, qty: number) {
  const existing = draft.items.find((i) => i.pid === pid);
  if (existing) existing.qty = Math.min(MAX_QTY, +(existing.qty + qty).toFixed(3));
  else draft.items.push({ pid, qty });
  draft.step = null;
  draft.pending = undefined;
  await saveDraft(client.id, draft);
}

/** Telegram ID bo'yicha MIJOZni topadi (boshqa rollarga tegmaydi). */
export async function findClientByTelegramId(tgId: number) {
  return prisma.counterparty.findFirst({
    where: {
      type: "CLIENT",
      deletedAt: null,
      metadata: { path: ["telegram_id"], equals: tgId },
    },
  });
}

/** Barcha "co:..." tugmalari. */
export async function handleClientOrderCallback(query: CallbackQuery, client: Counterparty) {
  const parts = (query.data ?? "").split(":");
  const action = parts[1];
  const chatId = query.message?.chat.id ?? query.from.id;
  const t: Target = { chatId, messageId: query.message?.message_id };
  let draft = await getDraft(client.id);
  let alert: string | undefined;

  switch (action) {
    case "cat":
      draft.step = null;
      await saveDraft(client.id, draft);
      await showCategories(t, draft);
      break;

    case "l":
      await showProducts(t, draft, parts[2] ?? "all", Number(parts[3]) || 0);
      break;

    case "p": {
      const [p] = await loadProducts([parts[2] ?? ""]);
      if (!p) {
        alert = "Bu mahsulot endi sotuvda yo'q";
        await showCategories(t, draft);
        break;
      }
      draft.step = "qty";
      draft.pending = p.id;
      await saveDraft(client.id, draft);
      await show(
        t,
        `📦 <b>${escape(p.name)}</b>\nNarxi: ${money(p.basePrice ?? 0)} / ${UNIT_LABEL[p.unitType]}\n\n` +
          `Nechta ${UNIT_LABEL[p.unitType]} kerak? Sonni yozing yoki tugmani bosing:`,
        {
          inline_keyboard: [
            [1, 5, 10].map((n) => ({ text: String(n), callback_data: `co:q:${p.id}:${n}` })),
            [{ text: "⬅️ Orqaga", callback_data: "co:cat" }],
          ],
        }
      );
      break;
    }

    case "q": {
      const qty = Number(parts[3]);
      const [p] = await loadProducts([parts[2] ?? ""]);
      if (!p || ![1, 5, 10].includes(qty)) {
        alert = "Mahsulot topilmadi";
        await showCategories(t, draft);
        break;
      }
      await addToCart(client, draft, p.id, qty);
      draft = await getDraft(client.id);
      await showCart(t, client, draft);
      break;
    }

    case "cart":
      draft.step = null;
      await saveDraft(client.id, draft);
      await showCart(t, client, draft);
      break;

    case "rm":
      draft.items = draft.items.filter((i) => i.pid !== parts[2]);
      await saveDraft(client.id, draft);
      await showCart(t, client, draft);
      break;

    case "clr":
      await saveDraft(client.id, { items: [], step: null });
      await show(t, "🗑 Savat tozalandi.", {
        inline_keyboard: [[{ text: "➕ Mahsulot tanlash", callback_data: "co:cat" }]],
      });
      break;

    case "go": {
      const lines = await cartLines(draft);
      if (lines.length === 0) {
        await showCart(t, client, draft);
        break;
      }
      draft.step = "address";
      await saveDraft(client.id, draft);
      await show(
        t,
        "📍 <b>Yetkazib berish manzilini yozing</b>\n(masalan: Toshkent, Chilonzor 5-kvartal, 12-uy)",
        { inline_keyboard: [[{ text: "Keyinroq aytaman", callback_data: "co:skip" }]] }
      );
      break;
    }

    case "skip":
      draft.address = null;
      draft.step = null;
      await saveDraft(client.id, draft);
      await showConfirm(t, client, draft);
      break;

    case "ok":
      alert = await submitOrder(chatId, client, t.messageId);
      break;

    case "x":
      await saveDraft(client.id, null);
      await show(t, "❌ Buyurtma bekor qilindi.");
      break;

    case "free":
      // Katalogda yo'q narsa kerak bo'lsa — eski usul: erkin matn so'rovi
      await saveDraft(client.id, null);
      await prisma.counterparty.update({
        where: { id: client.id },
        data: {
          metadata: {
            ...((client.metadata as ClientMeta | null) ?? {}),
            order_draft: null,
            awaiting_order_request: true,
          } as Prisma.InputJsonValue,
        },
      });
      await show(
        t,
        "📦 Nima kerakligini bitta xabarda yozing — mahsulot nomi va miqdorini ko'rsating.\n\n" +
          "Masalan: <i>\"Polizol 33kg standart, 20 dona\"</i>"
      );
      break;
  }

  await answerCallbackQuery(query.id, alert).catch(() => {});
}

// ───────────────────────── buyurtmani yaratish ─────────────────────────

// Xato bo'lsa — mijozga ko'rsatiladigan qisqa matn qaytaradi (alert uchun).
async function submitOrder(
  chatId: number,
  client: Counterparty,
  messageId?: number
): Promise<string | undefined> {
  if (submitting.has(client.id)) return "Buyurtma yuborilmoqda…";
  submitting.add(client.id);
  try {
    const draft = await getDraft(client.id);
    const lines = await cartLines(draft);
    if (lines.length === 0) {
      await show({ chatId, messageId }, "🛒 Savatingiz bo'sh.", {
        inline_keyboard: [[{ text: "➕ Mahsulot tanlash", callback_data: "co:cat" }]],
      });
      return;
    }
    const total = lines.reduce((s, l) => s + l.sum, 0);

    const profile = await prisma.clientProfile.findUnique({
      where: { counterpartyId: client.id },
    });
    // Kredit limiti oshsa ham buyurtmani RAD ETMAYMIZ — menejerga ogohlantirish
    // bilan tushadi, qaror menejerda.
    let limitNote = "";
    if (profile?.creditLimitEnabled && profile.creditLimit != null) {
      const agg = await prisma.order.aggregate({
        where: { clientId: client.id, status: { not: "CANCELLED" } },
        _sum: { agreedAmount: true, paidAmount: true },
      });
      const debt = (agg._sum.agreedAmount ?? 0) - (agg._sum.paidAmount ?? 0);
      if (debt + total > profile.creditLimit) {
        limitNote =
          `⚠️ Kredit limiti oshadi: joriy qarz ${money(debt)} + yangi ${money(total)} ` +
          `> limit ${money(profile.creditLimit)}`;
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber("BZ"),
        type: profile?.customerKind === "RESELLER" ? "WHOLESALE" : "RETAIL",
        status: "BUYURTMA_OLINDI",
        channel: "TELEGRAM",
        priority: "NORMAL",
        orderCurrency: "UZS",
        agreedAmount: total,
        estimatedAmount: total,
        paidAmount: 0,
        paymentType: "DEFERRED",
        clientId: client.id,
        clientNameSnapshot: client.name,
        clientPhoneSnapshot: client.phone,
        receiverName: client.name,
        receiverPhone: client.phone,
        deliveryAddress: draft.address ?? undefined,
        note: ["📱 Telegram bot orqali mijoz o'zi buyurtma berdi", limitNote]
          .filter(Boolean)
          .join("\n"),
        items: {
          create: lines.map((l) => ({
            catalogProductId: l.pid,
            productNameSnapshot: l.name,
            quantity: l.qty,
            unitPrice: l.price,
            currency: "UZS",
          })),
        },
        statusHistory: {
          create: {
            toStatus: "BUYURTMA_OLINDI",
            changedById: `telegram:${client.id}`,
            reason: "Mijoz Telegram botdan buyurtma berdi",
          },
        },
      },
    });

    await saveDraft(client.id, null);

    await prisma.notification.create({
      data: {
        type: limitNote ? "WARNING" : "INFO",
        title: `📱 Telegramdan buyurtma — ${client.name}`,
        body:
          `${order.orderNumber}: ${lines.length} xil mahsulot, ${money(total)}` +
          (limitNote ? `\n${limitNote}` : ""),
        link: `/buyurtmalar/${order.id}`,
      },
    });

    await show(
      { chatId, messageId },
      `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
        `Raqami: <b>${escape(order.orderNumber)}</b>\n` +
        `Summa: <b>${money(total)}</b>\n\n` +
        `Menejerimiz tez orada siz bilan bog'lanadi.`
    );
    // Pastdagi asosiy menyu tugmalari ko'rinib tursin
    await sendMessage(chatId, "Boshqa nima kerak?", { reply_markup: clientKeyboard }).catch(() => {});

    await sendGroupMessage(
      `🆕 <b>Telegramdan yangi buyurtma</b>\n` +
        `📦 ${escape(order.orderNumber)}\n` +
        `👤 ${escape(client.name)} — ${escape(client.phone ?? "—")}\n` +
        lines.map((l) => `• ${escape(l.name)} — ${qtyText(l.qty)} ${UNIT_LABEL[l.unit]}`).join("\n") +
        `\n💰 ${money(total)}` +
        (limitNote ? `\n${escape(limitNote)}` : "")
    ).catch(() => {});
  } catch (e) {
    console.error("[client order]", e);
    return "Xatolik yuz berdi, qaytadan urinib ko'ring";
  } finally {
    submitting.delete(client.id);
  }
}
