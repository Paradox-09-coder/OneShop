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

/**
 * Audio (masalan Telegram ovozli xabar, OGG/Opus) ni Gemini orqali
 * o'zbek tilidagi matnga o'giradi. Xato bo'lsa — throw qiladi, chaqiruvchi
 * tomon foydalanuvchiga tushunarli xabar ko'rsatishi kerak.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string
): Promise<string> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY sozlanmagan");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Gemini xatosi: ${data?.error?.message ?? res.statusText}`
    );
  }

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini matn qaytarmadi");
  return text.trim();
}
