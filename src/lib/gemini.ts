// Gemini (Google AI Studio) — ovozli xabarni matnga o'girish.
// Meeting: "ovozli xabar tashlasalar ham o'zi kiritib qo'yadi robotni o'zi."

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// "gemini-flash-latest" alias ANIQ VERSIYAGA PIN QILINMAGAN — production'da
// sinovdan o'tkazilganda bu hozir "gemini-3.8-flash"ga ishora qilib chiqdi,
// audio uchun "thinking" bosqichi bilan 50-90s+ javob berayotgan (ba'zan
// 90s'dan ham oshib ketadi). Aniq "gemini-3.6-flash" versiyasi xuddi shu
// audio uchun izchil ~3-4s javob berdi (uch marta sinovdan o'tkazildi).
// Shuning uchun aniq versiyaga pin qilamiz — Google keyinchalik buni ham
// o'chirsa, xato aniq "model topilmadi" bo'lib chiqadi (sekin osilib
// qolish emas), shunda MODEL'ni yangilash kerak bo'ladi.
const MODEL = "gemini-3.6-flash";

export function isGeminiConfigured() {
  return !!API_KEY;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

// "parts[0]" deb ishonib bo'lmaydi — model "thinking"ni yoqib qo'yganda
// (yoki Google standart qiymatini o'zgartirganda, bir marta "-latest"
// alias'ida shunday bo'lgan edi) fikrlash qismi alohida part sifatida
// kelishi mumkin, asosiy javob keyingi part'da bo'ladi. Shu sababli barcha
// part'larni ko'rib, "thought" deb belgilanmagan birinchi matnni olamiz.
function extractText(data: GeminiResponse): string | undefined {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const answer = parts.find((p) => p.text && !p.thought);
  return answer?.text ?? parts.find((p) => p.text)?.text;
}

function describeEmptyResponse(data: GeminiResponse): string {
  const finishReason = data?.candidates?.[0]?.finishReason;
  const blockReason = data?.promptFeedback?.blockReason;
  const detail = blockReason
    ? `bloklandi: ${blockReason}`
    : finishReason && finishReason !== "STOP"
      ? `finishReason: ${finishReason}`
      : "sabab noma'lum";
  return `Gemini matn qaytarmadi (${detail})`;
}

async function callGemini(body: Record<string, unknown>): Promise<GeminiResponse> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY sozlanmagan");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const attempts = 2;

  for (let attempt = 1; attempt <= attempts; attempt++) {
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
      if (overloaded && attempt < attempts) {
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
  const data = await callGemini({
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
    // Transkripsiya oddiy vazifa — "thinking" kerak emas va ba'zan butun
    // token byudjetini fikrlashga sarflab, javob matnisiz qolib ketishiga
    // olib kelgan ("Gemini matn qaytarmadi" xatosi shundan kelib chiqqan).
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const text = extractText(data);
  if (!text) throw new Error(describeEmptyResponse(data));
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
 * to'lov uchun kassadan 500 ming to'ladim"). Ikki bosqichda ishlaydi: avval
 * transcribeAudio (matn), keyin matndan JSON struktura ajratiladi — har
 * ikkisi ham bir necha soniyada tugaydi. Forma shu javob bilan oldindan
 * to'ldiriladi, lekin tranzaksiya YARATILMAYDI: rahbar ko'rib, tasdiqlab
 * "Saqlash" bosishi kerak.
 */
export async function parseVoiceTransaction(
  audio: Buffer,
  mimeType: string,
  accountNames: string[]
): Promise<VoiceTransactionResult> {
  const transcript = await transcribeAudio(audio, mimeType);

  const prompt =
    "Quyidagi matnda odam kassa/bank tranzaksiyasi (pul kirim yoki chiqimi) haqida gapirgan. " +
    "Shu matnni tahlil qilib, faqat quyidagi JSON formatda javob ber, boshqa hech narsa yozmasdan:\n" +
    '{"kind": "IN" yoki "OUT", "amount": raqam (faqat son), ' +
    '"currency": "UZS" yoki "USD" yoki "EUR" yoki "RUB", ' +
    `"accountName": mavjud hisoblardan eng mos keladigani yoki null (mavjud hisoblar: ${accountNames.join(", ")}), ` +
    '"description": qisqa izoh (masalan "Kommunal to\'lov")}\n' +
    "\"kind\" — agar pul kirim bo'lsa (sotuv, to'lov qabul qilindi) \"IN\", agar chiqim bo'lsa (xarajat, to'lov qilindi) \"OUT\". " +
    "Agar summa aniq aytilmagan bo'lsa, amount: 0 qaytar.\n\n" +
    `Matn: "${transcript}"`;

  const data = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const raw = extractText(data);
  if (!raw) throw new Error(describeEmptyResponse(data));

  let parsed: Partial<VoiceTransactionResult>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini javobini o'qib bo'lmadi");
  }

  return {
    transcript,
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
