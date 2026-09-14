"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Save } from "lucide-react";
import AddCounterpartyButton from "../../kontragentlar/add-counterparty-button";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  carNumber: string | null;
}

interface Props {
  orderId: string;
  drivers: Driver[];
  initial: {
    driverName: string;
    driverPhone: string;
    driverCarNumber: string;
    deliveryCost: number;
    deliveryAddress: string;
    receiverName: string;
    receiverPhone: string;
    expectedDeliveryDate: string;
    deliveryPaid: boolean;
  };
}

export default function LogisticsPanel({ orderId, drivers, initial }: Props) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [driversList, setDriversList] = useState(drivers);
  // Avval qo'lda kiritilgan (yoki hali tanlanmagan) buyurtmalar uchun —
  // telefon raqami bo'yicha mos haydovchini avtomatik topamiz.
  const [driverId, setDriverId] = useState(
    () => driversList.find((d) => d.phone && d.phone === initial.driverPhone)?.id ?? ""
  );
  // Raqam maydoni alohida matn sifatida boshqariladi — aks holda foydalanuvchi
  // "0" ni butunlay o'chirib bo'sh qoldira olmaydi (bo'sh qiymat darhol 0'ga
  // aylanib, ekranda yana "0" bo'lib qolaveradi).
  const [costText, setCostText] = useState(
    initial.deliveryCost ? String(initial.deliveryCost) : ""
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function selectDriver(id: string) {
    setDriverId(id);
    const d = driversList.find((x) => x.id === id);
    setF((prev) => ({
      ...prev,
      driverName: d?.name ?? "",
      driverPhone: d?.phone ?? "",
      driverCarNumber: d?.carNumber ?? "",
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // "Rejalashtirilgan sana" — faqat to'g'ri YYYY-MM-DD ko'rinishida
      // yuboriladi, aks holda serverga noto'g'ri sana (masalan qo'lda
      // kiritishda paydo bo'lgan xato yil) yuborilib xato beradi.
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(f.expectedDeliveryDate)
        ? f.expectedDeliveryDate
        : null;
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: f.driverName || null,
          driverPhone: f.driverPhone || null,
          driverCarNumber: f.driverCarNumber || null,
          deliveryCost: Number(costText) || null,
          deliveryAddress: f.deliveryAddress || null,
          receiverName: f.receiverName || null,
          receiverPhone: f.receiverPhone || null,
          expectedDeliveryDate: validDate,
          deliveryPaidAt: f.deliveryPaid ? new Date().toISOString() : null,
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
          <label className="block text-xs text-ink-soft mb-1">
            Manzil
            <span className="text-ink-soft font-normal">
              {" "}
              — mijoz aniq lokatsiya yuborgan bo'lsa, o'sha Google Maps
              havolasini qo'ying (eng aniqi); bilmasa, tuman/mahalla nomini
              taxminan yozib qo'ysangiz ham bo'ladi
            </span>
          </label>
          <input
            value={f.deliveryAddress}
            onChange={(e) => setF({ ...f, deliveryAddress: e.target.value })}
            placeholder="Google Maps havolasi yoki taxminiy manzil (tuman, mahalla...)"
            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-soft mb-1">Haydovchi</label>
          <select
            value={driverId}
            onChange={(e) => selectDriver(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
          >
            <option value="">— tanlang —</option>
            {driversList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.phone ? ` (${d.phone})` : ""}
              </option>
            ))}
          </select>
          {driverId && (f.driverPhone || f.driverCarNumber) && (
            <p className="text-xs text-ink-soft mt-1">
              {f.driverPhone || "—"}
              {f.driverCarNumber ? ` · Mashina: ${f.driverCarNumber}` : ""}
            </p>
          )}
          <div className="mt-1.5">
            <AddCounterpartyButton
              defaultType="EMPLOYEE"
              lockType
              variant="link"
              label="Yangi haydovchi"
              title="Yangi haydovchi"
              defaultPosition="Haydovchi"
              onCreated={(party) => {
                const nd: Driver = {
                  id: party.id,
                  name: party.name,
                  phone: party.phone,
                  carNumber: party.carNumber,
                };
                setDriversList((prev) => [nd, ...prev]);
                setDriverId(nd.id);
                setF((prev) => ({
                  ...prev,
                  driverName: nd.name,
                  driverPhone: nd.phone ?? "",
                  driverCarNumber: nd.carNumber ?? "",
                }));
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink-soft mb-1">Yo'l kira (so'm)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={costText}
            onChange={(e) => setCostText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-white"
          />
        </div>
        <label className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={f.deliveryPaid}
            onChange={(e) => setF({ ...f, deliveryPaid: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-xs">
            <span className="font-semibold">Yo'l kira haydovchiga to'landi</span>
            <br />
            <span className="text-ink-soft">
              Belgilansa — haydovchi Telegram botdagi "Yo'l kira" bo'limida
              buni to'langan deb ko'radi.
            </span>
          </span>
        </label>
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
