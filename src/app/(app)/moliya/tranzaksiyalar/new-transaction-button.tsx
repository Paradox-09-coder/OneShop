"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import MoneyInput from "@/components/money-input";
import { blobToWav } from "@/lib/audio-to-wav";
import Select from "@/components/select";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}
interface CounterpartyOption {
  id: string;
  name: string;
  type: string;
}
interface OpenOrderOption {
  id: string;
  orderNumber: string;
  agreedAmount: number;
  paidAmount: number;
  orderCurrency: string;
}

export default function NewTransactionButton({
  accounts,
  counterparties,
}: {
  accounts: AccountOption[];
  counterparties: CounterpartyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"IN" | "OUT">("IN");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [openOrders, setOpenOrders] = useState<OpenOrderOption[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const account = accounts.find((a) => a.id === accountId);
  const counterparty = counterparties.find((c) => c.id === counterpartyId);
  const showOrderPicker = kind === "IN" && counterparty?.type === "CLIENT";

  function reset() {
    setKind("IN");
    setAccountId(accounts[0]?.id ?? "");
    setCounterpartyId("");
    setOrderId("");
    setOpenOrders([]);
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setError("");
    setVoiceTranscript("");
  }

  async function startRecording() {
    setError("");
    setVoiceTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void submitVoice(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofonga ruxsat berilmadi");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function submitVoice(blob: Blob) {
    setVoiceLoading(true);
    setError("");
    try {
      const wav = await blobToWav(blob);
      const form = new FormData();
      form.append("audio", wav, "voice.wav");
      const res = await fetch("/api/moliya/tranzaksiya/voice", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Ovozni tushunolmadim");
        return;
      }
      const v = data.data;
      setVoiceTranscript(v.transcript);
      setKind(v.kind);
      if (v.amount > 0) setAmount(String(v.amount));
      if (v.description) setDescription(v.description);
      if (v.accountId) setAccountId(v.accountId);
    } catch {
      setError("Ovozni yuborishda xato — internetni tekshirib qayta urinib ko'ring");
    } finally {
      setVoiceLoading(false);
    }
  }

  async function loadOpenOrders(cpId: string, knd: "IN" | "OUT") {
    setOrderId("");
    setOpenOrders([]);
    const cp = counterparties.find((c) => c.id === cpId);
    if (knd !== "IN" || cp?.type !== "CLIENT" || !cpId) return;
    const res = await fetch(`/api/orders?clientId=${encodeURIComponent(cpId)}&open=1`);
    const data = await res.json();
    if (data.ok) setOpenOrders(data.data.orders);
  }

  function onKindChange(knd: "IN" | "OUT") {
    setKind(knd);
    loadOpenOrders(counterpartyId, knd);
  }

  function onCounterpartyChange(id: string) {
    setCounterpartyId(id);
    loadOpenOrders(id, kind);
  }

  async function submit() {
    if (!accountId) {
      setError("Hisobni tanlang");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Summani kiriting");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/moliya/tranzaksiya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          kind,
          amount: amt,
          counterpartyId: counterpartyId || undefined,
          orderId: showOrderPicker ? orderId || undefined : undefined,
          description: description.trim() || undefined,
          date,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Xatolik yuz berdi");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm"
      >
        <Plus size={15} /> Tranzaksiya qo'shish
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-panel rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Yangi tranzaksiya</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-ink-soft"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={voiceLoading}
              className={cn(
                "w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition disabled:opacity-50",
                recording
                  ? "bg-danger/10 border-danger text-danger animate-pulse"
                  : "border-primary/30 text-primary hover:bg-primary/5"
              )}
            >
              {recording ? (
                <>
                  <Square size={14} /> To&apos;xtatish
                </>
              ) : voiceLoading ? (
                "Tinglab tahlil qilinmoqda..."
              ) : (
                <>
                  <Mic size={15} /> Ovozli aytib kiriting
                </>
              )}
            </button>
            {voiceTranscript && (
              <p className="text-xs text-ink-soft italic mb-3 -mt-1">
                🎙 &quot;{voiceTranscript}&quot;
              </p>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onKindChange("IN")}
                  className={cn(
                    "py-2 rounded-xl text-sm font-semibold border transition",
                    kind === "IN"
                      ? "bg-success/10 border-success text-success"
                      : "border-border text-ink-soft hover:bg-gray-50"
                  )}
                >
                  Kirim
                </button>
                <button
                  type="button"
                  onClick={() => onKindChange("OUT")}
                  className={cn(
                    "py-2 rounded-xl text-sm font-semibold border transition",
                    kind === "OUT"
                      ? "bg-danger/10 border-danger text-danger"
                      : "border-border text-ink-soft hover:bg-gray-50"
                  )}
                >
                  Chiqim
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Hisob
                </label>
                <Select
                  value={accountId}
                  onChange={setAccountId}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Kontragent (ixtiyoriy)
                </label>
                <Select
                  value={counterpartyId}
                  onChange={onCounterpartyChange}
                  placeholder="— tanlanmagan —"
                  options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>

              {showOrderPicker && openOrders.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Qaysi buyurtma (shot-faktura) uchun? (ixtiyoriy)
                  </label>
                  <Select
                    value={orderId}
                    onChange={setOrderId}
                    placeholder="— aniqlanmagan (mijozga so'raladi) —"
                    options={openOrders.map((o) => ({
                      value: o.id,
                      label: `${o.orderNumber} — qolgan ${(o.agreedAmount - o.paidAmount).toLocaleString("ru-RU")} ${o.orderCurrency}`,
                    }))}
                  />
                  <p className="text-[11px] text-ink-soft mt-1">
                    Tanlansa, mijozga Telegram orqali shu buyurtma yopilgani haqida xabar ketadi.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Summa {account ? `(${account.currency})` : ""}
                </label>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Sana
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masalan: do'kondan naqd sotuv"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel text-sm"
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full mt-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
