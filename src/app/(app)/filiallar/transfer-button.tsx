"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowRight } from "lucide-react";
import Select from "@/components/select";

interface Warehouse {
  id: string;
  name: string;
}

export default function TransferButton({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!fromId || !toId) return setErr("Ikkalasi ham tanlansin");
    if (fromId === toId) return setErr("Bir xil ombor bo'lishi mumkin emas");
    setSaving(true);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromWarehouseId: fromId, toWarehouseId: toId, note }),
      });
      const d = await res.json();
      if (!d.ok) return setErr(d.error?.message ?? "Xato");
      setOpen(false);
      setFromId("");
      setToId("");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark"
      >
        <Plus size={16} /> Yangi o'tkazma
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Yangi ichki o'tkazma</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Qayerdan</label>
                  <Select
                    value={fromId}
                    onChange={setFromId}
                    placeholder="— tanlang —"
                    options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">Qayerga</label>
                  <Select
                    value={toId}
                    onChange={setToId}
                    placeholder="— tanlang —"
                    options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                  />
                </div>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Izoh (ixtiyoriy)"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />

              {err && (
                <div className="p-2 rounded-lg bg-danger-light/30 text-danger text-sm">
                  {err}
                </div>
              )}

              <p className="text-xs text-ink-soft">
                O'tkazma yaratilgach, sahifada mahsulotlar qo'shishingiz mumkin.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "..." : "Yaratish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
