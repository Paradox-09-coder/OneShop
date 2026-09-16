import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import { parseVoiceTransaction, isGeminiConfigured } from "@/lib/gemini";

// Meeting: "ikkinchi etap ovoz" — rahbar tranzaksiyani forma to'ldirmasdan
// ovozli aytib kiritsin. Bu yerda faqat audio matn+strukturaga o'giriladi va
// eng mos hisob topiladi — pul harakati o'zi YARATILMAYDI, front-end forma
// shu javob bilan oldindan to'ldiriladi va rahbar ko'rib "Saqlash" bosadi.

export async function POST(req: Request) {
  try {
    await requireApiPermission("finance.write");

    if (!isGeminiConfigured()) {
      return jsonErr("Ovozli kiritish hozircha sozlanmagan", 503);
    }

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return jsonErr("Audio fayl topilmadi", 400);
    }

    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { id: true, name: true, currency: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseVoiceTransaction(
      buffer,
      file.type || "audio/webm",
      accounts.map((a) => a.name)
    );

    const matchedAccount =
      accounts.find(
        (a) => a.name.toLowerCase() === result.accountName?.toLowerCase()
      ) ??
      accounts.find((a) => a.currency === result.currency) ??
      accounts[0] ??
      null;

    return jsonOk({ ...result, accountId: matchedAccount?.id ?? null });
  } catch (e) {
    return handleError(e);
  }
}
