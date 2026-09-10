"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Save } from "lucide-react";

interface Props {
  orderId: string;
  initial: {
    driverName: string;
    driverPhone: string;
    driverCarNumber: string;
    deliveryCost: number;
    deliveryAddress: string;
    receiverName: string;
    receiverPhone: string;
    expectedDeliveryDate: string;
  };
}

export default function LogisticsPanel({ orderId, initial }: Props) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: f.driverName || null,
          driverPhone: f.driverPhone || null,
          driverCarNumber: f.driverCarNumber || null,
          deliveryCost: Number(f.deliveryCost) || null,
          deliveryAddress: f.deliveryAddress || null,
          receiverName: f.receiverName || null,
          receiverPhone: f.receiverPhone || null,
          expectedDeliveryDate: f.expectedDeliveryDate || null,
        }),
      });
      const d = await res.json();
      if (!d.ok) return setMsg(d.error?.message ?? "Xato");
      setMsg("Saqlandi ✓");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Truck size={16} className="text-primary" /> Yetkazish (logistika)
      </h3>
      <div className="space-y-2 text-sm">
        <div>
          <label className="block text-xs text-ink-soft mb-1">Manzil</label>
          <input
            value={f.deliveryAddress}
            onChange={(e) => setF({ ...f, deliveryAddress: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
            placeholder="Toshkent, Chilonzor..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-soft mb-1">Haydovchi</label>
            <input
              value={f.driverName}
              onChange={(e) => setF({ ...f, driverName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              placeholder="Otabek"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">Telefon</label>
            <input
              value={f.driverPhone}
              onChange={(e) => setF({ ...f, driverPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              placeholder="+998 90"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-soft mb-1">Mashina raqami</label>
            <input
              value={f.driverCarNumber}
              onChange={(e) => setF({ ...f, driverCarNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              placeholder="01 A 123 AB"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">Yo'l kira (so'm)</label>
            <input
              type="number"
              value={f.deliveryCost}
              onChange={(e) =>
                setF({ ...f, deliveryCost: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink-soft mb-1">
            Rejalashtirilgan sana
          </label>
          <input
            type="date"
            value={f.expectedDeliveryDate}
            onChange={(e) =>
              setF({ ...f, expectedDeliveryDate: e.target.value })
            }
            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-soft mb-1">
              Qabul qiluvchi
            </label>
            <input
              value={f.receiverName}
              onChange={(e) => setF({ ...f, receiverName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">Telefon</label>
            <input
              value={f.receiverPhone}
              onChange={(e) => setF({ ...f, receiverPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 mt-2 inline-flex items-center justify-center gap-1"
        >
          <Save size={14} /> {saving ? "..." : "Saqlash"}
        </button>
        {msg && <p className="text-xs text-center text-success">{msg}</p>}
      </div>
    </div>
  );
}
