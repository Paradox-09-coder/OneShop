"use client";

import { useState, type FormEvent } from "react";
import PhoneInput from "@/components/phone-input";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import Select from "@/components/select";
import { useDialog } from "@/components/use-dialog";

export interface PartyForEdit {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  telegram: string | null;
  address: string | null;
  inn: string | null;
  status: string;
}

const TYPE_OPTIONS = [
  { value: "CLIENT", label: "Mijoz" },
  { value: "SUPPLIER", label: "Ta'minotchi" },
  { value: "EMPLOYEE", label: "Xodim" },
  { value: "FOUNDER", label: "Ta'sischi" },
  { value: "LENDER", label: "Kreditor" },
  { value: "OTHER", label: "Boshqa" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Faol" },
  { value: "inactive", label: "Nofaol" },
];

export function EditPartyButton({ party }: { party: PartyForEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: party.name,
    type: party.type,
    phone: party.phone ?? "",
    phone2: party.phone2 ?? "",
    email: party.email ?? "",
    telegram: party.telegram ?? "",
    address: party.address ?? "",
    inn: party.inn ?? "",
    status: party.status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openModal() {
    // Har ochilganda joriy qiymatlar bilan to'ldiriladi (oldingi bekor qilingan
    // o'zgarishlar qolib ketmasin)
    setForm({
      name: party.name,
      type: party.type,
      phone: party.phone ?? "",
      phone2: party.phone2 ?? "",
      email: party.email ?? "",
      telegram: party.telegram ?? "",
      address: party.address ?? "",
      inn: party.inn ?? "",
      status: party.status,
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/counterparties/${encodeURIComponent(party.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Saqlab bo'lmadi");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Server bilan ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full px-3 py-2 rounded-xl border border-border bg-panel";
  const label = "block text-sm font-medium mb-1.5";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-panel text-sm font-semibold hover:border-primary/40 hover:text-primary transition"
      >
        <Pencil size={15} /> Tahrirlash
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={onSubmit}
            className="bg-panel rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Kontragentni tahrirlash</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={label}>Ismi / Nomi</label>
                <input
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  required
                  autoFocus
                  className={input}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Kontragent turi</label>
                  <Select value={form.type} onChange={set("type")} options={TYPE_OPTIONS} />
                </div>
                <div>
                  <label className={label}>Holati</label>
                  <Select value={form.status} onChange={set("status")} options={STATUS_OPTIONS} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Telefon</label>
                  <PhoneInput
                    value={form.phone}
                    onChange={set("phone")}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Qo'shimcha telefon</label>
                  <PhoneInput
                    value={form.phone2}
                    onChange={set("phone2")}
                    className={input}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email")(e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Telegram</label>
                  <input
                    value={form.telegram}
                    onChange={(e) => set("telegram")(e.target.value)}
                    className={input}
                    placeholder="@username"
                  />
                </div>
              </div>
              <div>
                <label className={label}>Manzil</label>
                <input
                  value={form.address}
                  onChange={(e) => set("address")(e.target.value)}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>INN</label>
                <input
                  value={form.inn}
                  onChange={(e) => set("inn")(e.target.value)}
                  className={input}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-danger-light/30 border border-danger/40 text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function DeletePartyButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { confirm, alert, Dialog } = useDialog();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const ok = await confirm(
      `«${name}» kontragentini o'chirasizmi?\n\nU ro'yxatlardan yo'qoladi. Eski buyurtma va to'lovlar tarixi saqlanib qoladi.`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/counterparties/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error?.message ?? "O'chirib bo'lmadi");
        return;
      }
      router.push("/kontragentlar");
      router.refresh();
    } catch {
      alert("Server bilan ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-danger/40 text-danger text-sm font-semibold hover:bg-danger/10 transition disabled:opacity-50"
      >
        <Trash2 size={15} /> {loading ? "O'chirilmoqda..." : "O'chirish"}
      </button>
      {Dialog}
    </>
  );
}
