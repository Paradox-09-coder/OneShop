// Telegram webhook o'rnatish endpoint.
// Foydalanish: POST /api/telegram/setup — o'z domainga webhook o'rnatadi

import { setWebhook, getWebhookInfo, isTelegramConfigured } from "@/lib/telegram";
import { requireApiPermission, handleError, jsonOk, jsonErr } from "@/lib/api";

export async function GET() {
  try {
    await requireApiPermission("settings.write");
    if (!isTelegramConfigured())
      return jsonErr("TELEGRAM_BOT_TOKEN o'rnatilmagan", 400, "NOT_CONFIGURED");
    const info = await getWebhookInfo();
    return jsonOk({ configured: true, webhook: info });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireApiPermission("settings.write");
    if (!isTelegramConfigured())
      return jsonErr("TELEGRAM_BOT_TOKEN o'rnatilmagan", 400, "NOT_CONFIGURED");

    // Auto-derive URL from request headers (Railway sets host header correctly,
    // req.url uses internal port which Telegram rejects).
    const host = req.headers.get("host") ?? new URL(req.url).host;
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const webhookUrl = `${proto}://${host}/api/telegram/webhook`;

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const result = await setWebhook(webhookUrl, secret);
    const info = await getWebhookInfo();
    return jsonOk({ result, info, webhookUrl });
  } catch (e) {
    return handleError(e);
  }
}
