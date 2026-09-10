"use client";

import { useState } from "react";
import { Send, Check, X, Copy } from "lucide-react";

interface Props {
  configured: boolean;
  webhookInfo: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null;
}

export default function TelegramSetup({ configured, webhookInfo }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState(webhookInfo);

  async function setup() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST" });
      const d = await res.json();
      if (!d.ok) return setMsg(d.error?.message ?? "Xato");
      setMsg("✓ Webhook o'rnatildi");
      setInfo(d.data.info);
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="p-4 rounded-xl bg-danger-light/20 border border-danger/30">
        <p className="text-sm font-semibold text-danger flex items-center gap-2">
          <X size={16} /> TELEGRAM_BOT_TOKEN o'rnatilmagan
        </p>
        <p className="text-xs text-ink-soft mt-2">
          Bot faol bo'lishi uchun Railway'ga <code className="bg-white px-1 rounded">TELEGRAM_BOT_TOKEN</code>{" "}
          environment variable qo'shing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 rounded-xl bg-success/10 border border-success/30 mb-3">
        <p className="text-sm font-semibold text-success flex items-center gap-2">
          <Check size={16} /> Token o'rnatilgan
        </p>
      </div>

      {info?.url ? (
        <div className="p-3 rounded-xl bg-gray-50 space-y-1 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-ink-soft">Webhook URL:</span>
            <code className="font-mono text-xs">{info.url}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Kutayotgan update'lar:</span>
            <b>{info.pending_update_count ?? 0}</b>
          </div>
          {info.last_error_message && (
            <div className="mt-2 p-2 rounded bg-danger-light/30 text-danger text-xs">
              Xato: {info.last_error_message}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-soft mb-3">
          Webhook hali o'rnatilmagan. Botni ishga tushirish uchun quyidagi tugmani bosing.
        </p>
      )}

      <button
        onClick={setup}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
      >
        <Send size={14} />
        {loading ? "..." : info?.url ? "Webhook'ni yangilash" : "Webhook o'rnatish"}
      </button>
      {msg && <span className="ml-3 text-sm text-success">{msg}</span>}

      <p className="text-xs text-ink-soft mt-4">
        <b>Sinov:</b> botga <code>/start</code> yozing va telefon raqamingizni yuboring.
        Agar siz bazada bor bo'lsangiz (mijoz/ta'minotchi/haydovchi sifatida) — sizni tanish
        qiladi va tegishli menyuni ko'rsatadi.
      </p>
    </div>
  );
}
