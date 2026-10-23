"use client";

import { useState } from "react";
import PhoneInput from "@/components/phone-input";
import { useRouter } from "next/navigation";
import { Truck, Save, Phone, Car, Plus, Pencil, MapPin, CalendarDays, User, Wallet } from "lucide-react";
import AddCounterpartyButton from "../../kontragentlar/add-counterparty-button";
import Select from "@/components/select";

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
  // Yetkazish endi yangi buyurtma yaratilayotganda belgilanadi — shu
  // sabab, agar buyurtmada hali hech qanday yetkazish ma'lumoti bo'lmasa
  // (masalan bu funksiyadan oldin yaratilgan eski buyurtma, yoki mijoz
  // o'zi olib ketadigan buyurtma), forma yopiq turadi va bekorga bo'sh
  // joy egallamaydi — kerak bo'lsa "+ Yetkazish qo'shish" bilan ochiladi.
  const hasDeliveryData = Boolean(
    initial.driverName ||
      initial.driverPhone ||
      initial.deliveryAddress ||
      initial.deliveryCost ||
      initial.receiverName ||
      initial.receiverPhone ||
      initial.expectedDeliveryDate
  );
  // Saqlangan holat — ko'rish rejimida shu ko'rsatiladi, "Bekor qilish"
  // bosilsa forma shu qiymatlarga qaytadi.
  const [saved, setSaved] = useState(initial);
  const [hasSaved, setHasSaved] = useState(hasDeliveryData);
  // Saqlangan ma'lumot bo'lsa — avval faqat ko'rish rejimi; o'zgartirish
  // uchun alohida "Tahrirlash" tugmasi bosiladi.
  const [editing, setEditing] = useState(false);
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
      setSaved({ ...f, deliveryCost: Number(costText) || 0 });
      setHasSaved(true);
      setEditing(false);
      setMsg("Saqlandi ✓");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setMsg(null);
    setEditing(true);
  }

  function cancelEdit() {
    setF(saved);
    setCostText(saved.deliveryCost ? String(saved.deliveryCost) : "");
    setDriverId(driversList.find((d) => d.phone && d.phone === saved.driverPhone)?.id ?? "");
    setMsg(null);
    setEditing(false);
  }

  if (!hasSaved && !editing) {
    return (
      <div className="panel p-5">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <Truck size={16} className="text-primary" /> Yetkazish (logistika)
        </h3>
        <p className="text-xs text-ink-soft mb-3">
          Bu buyurtmada yetkazish ma'lumoti kiritilmagan.
        </p>
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Plus size={14} /> Yetkazish qo'shish
        </button>
      </div>
    );
  }

  // Ko'rish rejimi: saqlangan ma'lumotlar o'qish uchun, o'zgartirish —
  // faqat "Tahrirlash" tugmasi orqali.
  if (!editing) {
    const isLink = /^https?:\/\//i.test(saved.deliveryAddress.trim());
    const row = "flex items-start gap-2.5 py-2 border-b border-border/60 last:border-0";
    const icon = "text-ink-soft mt-0.5 shrink-0";
    return (
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-bold flex items-center gap-2">
            <Truck size={16} className="text-primary" /> Yetkazish (logistika)
          </h3>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-semibold hover:border-primary/40 hover:text-primary transition"
          >
            <Pencil size={13} /> Tahrirlash
          </button>
        </div>
        <div className="text-sm">
          <div className={row}>
            <MapPin size={15} className={icon} />
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">Manzil</p>
              {!saved.deliveryAddress ? (
                <p className="text-ink-soft">—</p>
              ) : isLink ? (
                <a
                  href={saved.deliveryAddress.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Xaritada ochish
                </a>
              ) : (
                <p className="font-medium break-words">{saved.deliveryAddress}</p>
              )}
            </div>
          </div>
          <div className={row}>
            <Truck size={15} className={icon} />
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">Haydovchi</p>
              <p className="font-medium">{saved.driverName || "—"}</p>
              {(saved.driverPhone || saved.driverCarNumber) && (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {saved.driverPhone && (
                    <a
                      href={`tel:${saved.driverPhone}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <Phone size={12} /> {saved.driverPhone}
                    </a>
                  )}
                  {saved.driverCarNumber && (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                      <Car size={12} /> {saved.driverCarNumber}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={row}>
            <Wallet size={15} className={icon} />
            <div className="flex-1 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-ink-soft">{"Yo'l kira"}</p>
                <p className="font-medium">
                  {saved.deliveryCost
                    ? `${saved.deliveryCost.toLocaleString("ru-RU")} so'm`
                    : "—"}
                </p>
              </div>
              {saved.deliveryCost > 0 && (
                <span
                  className={`chip ${
                    saved.deliveryPaid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {saved.deliveryPaid ? "To'langan" : "To'lanmagan"}
                </span>
              )}
            </div>
          </div>
          <div className={row}>
            <CalendarDays size={15} className={icon} />
            <div>
              <p className="text-xs text-ink-soft">Rejalashtirilgan sana</p>
              <p className="font-medium">
                {saved.expectedDeliveryDate
                  ? saved.expectedDeliveryDate.split("-").reverse().join(".")
                  : "—"}
              </p>
            </div>
          </div>
          <div className={row}>
            <User size={15} className={icon} />
            <div>
              <p className="text-xs text-ink-soft">Qabul qiluvchi</p>
              <p className="font-medium">{saved.receiverName || "—"}</p>
              {saved.receiverPhone && (
                <a
                  href={`tel:${saved.receiverPhone}`}
                  className="text-xs font-medium text-primary"
                >
                  {saved.receiverPhone}
                </a>
              )}
            </div>
          </div>
        </div>
        {msg && <p className="text-xs text-center text-success mt-2">{msg}</p>}
      </div>
    );
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
            className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-soft mb-1">Haydovchi</label>
          <Select
            value={driverId}
            onChange={selectDriver}
            placeholder="— tanlang —"
            options={driversList.map((d) => ({
              value: d.id,
              label: d.name + (d.phone ? ` (${d.phone})` : ""),
            }))}
          />
          {driverId && (f.driverPhone || f.driverCarNumber) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {f.driverPhone && (
                <a
                  href={`tel:${f.driverPhone}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/15 text-xs font-medium text-ink hover:bg-primary/10"
                >
                  <Phone size={12} className="text-primary" /> {f.driverPhone}
                </a>
              )}
              {f.driverCarNumber && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-border text-xs font-medium text-ink">
                  <Car size={12} className="text-ink-soft" /> {f.driverCarNumber}
                </span>
              )}
            </div>
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
            className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
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
            className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
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
              className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">Telefon</label>
            <PhoneInput
              value={f.receiverPhone}
              onChange={(v) => setF({ ...f, receiverPhone: v })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
          >
            <Save size={14} /> {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
        {msg && <p className="text-xs text-center text-danger">{msg}</p>}
      </div>
    </div>
  );
}
