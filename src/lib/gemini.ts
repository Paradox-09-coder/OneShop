// Gemini (Google AI Studio) — ovozli xabarni matnga o'girish.
// Meeting: "ovozli xabar tashlasalar ham o'zi kiritib qo'yadi robotni o'zi."

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// "gemini-2.0-flash" google tomonidan butunlay o'chirilgan ("no longer
// available"). "-latest" alias'ini ishlatamiz — Google eski modelni
// o'chirganda ham bu doim joriy flash modelga ishora qiladi, kodni qayta
// o'zgartirish kerak bo'lmaydi.
const MODEL = "gemini-flash-latest";

export function isGeminiConfigured() {
  return !!API_KEY;
}

// Gemini vaqti-vaqti bilan "high demand"/503 qaytaradi (ishlab chiqarishda
// haqiqatan ham ko'ringan) — bitta marta qisqa kutib qayta urinamiz, aks
// holda so'rov abadiy osilib qolmasin deb 25s'dan keyin to'xtatamiz (aks
// holda front-end'da tugma "Eshitilmoqda..." holatida abadiy qolib ketadi).
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(body: Record<string, unknown>): Promise<GeminiResponse> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY sozlanmagan");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (e) {
      throw new Error(
        e instanceof Error && e.name === "TimeoutError"
          ? "Gemini javob bermadi (timeout) — birozdan keyin qayta urinib ko'ring"
          : `Gemini bilan bog'lanishda xato: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    const data = await res.json();
    if (!res.ok) {
      const message: string = data?.error?.message ?? res.statusText;
      const overloaded = /high demand|overloaded|503/i.test(message);
      if (overloaded && attempt === 1) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw new Error(
        overloaded
          ? "Gemini hozir band — birozdan keyin qayta urinib ko'ring"
          : `Gemini xatosi: ${message}`
      );
    }
    return data;
  }
  throw new Error("Gemini bilan bog'lanib bo'lmadi");
}

/**
 * Audio (masalan Telegram ovozli xabar, OGG/Opus) ni Gemini orqali
 * o'zbek tilidagi matnga o'giradi. Xato bo'lsa — throw qiladi, chaqiruvchi
 * tomon foydalanuvchiga tushunarli xabar ko'rsatishi kerak.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string
): Promise<string> {
  const data = (await callGemini({
    contents: [
      {
        parts: [
          {
            text:
              "Bu ovozli xabarni faqat o'zbek tilida yozma matnga o'gir. " +
              "Boshqa hech qanday izoh, sarlavha yoki tirnoq qo'ymasdan, " +
              "faqat aynan gapirilgan matnni qaytar.",
          },
          {
            inlineData: {
              mimeType,
              data: audio.toString("base64"),
            },
          },
        ],
      },
    ],
  }));

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini matn qaytarmadi");
  return text.trim();
}

export interface VoiceTransactionResult {
  transcript: string;
  kind: "IN" | "OUT";
  amount: number;
  currency: "UZS" | "USD" | "EUR" | "RUB";
  accountName: string | null;
  description: string;
}

/**
 * Meeting: "ikkinchi etap ovoz" — rahbar/xodim tranzaksiyani (kirim/chiqim)
 * qo'lda forma to'ldirmasdan, ovozli aytib kiritsin (masalan "kommunal
 * to'lov uchun kassadan 500 ming to'ladim"). Bitta Gemini chaqiruvida audio
 * to'g'ridan-to'g'ri strukturaviy JSON'ga o'giriladi — forma shu bilan
 * oldindan to'ldiriladi, lekin YARATILMAYDI: rahbar ko'rib, tasdiqlab
 * "Saqlash" bosishi kerak (pul harakati — avtomatik yaratish xavfli).
 */
export async function parseVoiceTransaction(
  audio: Buffer,
  mimeType: string,
  accountNames: string[]
): Promise<VoiceTransactionResult> {
  const prompt =
    "Bu ovozli xabarda odam kassa/bank tranzaksiyasi (pul kirim yoki chiqimi) haqida gapiryapti. " +
    "Avval xabarni o'zbek tilida transkript qil, keyin quyidagi JSON formatda javob ber, boshqa hech narsa yozmasdan:\n" +
    '{"transcript": "...", "kind": "IN" yoki "OUT", "amount": raqam (faqat son), ' +
    '"currency": "UZS" yoki "USD" yoki "EUR" yoki "RUB", ' +
    `"accountName": mavjud hisoblardan eng mos keladigani yoki null (mavjud hisoblar: ${accountNames.join(", ")}), ` +
    '"description": qisqa izoh (masalan "Kommunal to\'lov")}\n' +
    "\"kind\" — agar pul kirim bo'lsa (sotuv, to'lov qabul qilindi) \"IN\", agar chiqim bo'lsa (xarajat, to'lov qilindi) \"OUT\". " +
    "Agar summa aniq aytilmagan bo'lsa, amount: 0 qaytar.";

  const data = await callGemini({
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: audio.toString("base64") } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  const raw: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini matn qaytarmadi");

  let parsed: Partial<VoiceTransactionResult>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini javobini o'qib bo'lmadi");
  }

  return {
    transcript: parsed.transcript ?? "",
    kind: parsed.kind === "OUT" ? "OUT" : "IN",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    currency:
      parsed.currency === "USD" || parsed.currency === "EUR" || parsed.currency === "RUB"
        ? parsed.currency
        : "UZS",
    accountName: parsed.accountName ?? null,
    description: parsed.description ?? "",
  };
}
