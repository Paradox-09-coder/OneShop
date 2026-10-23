"use client";

import { useState } from "react";
import PhoneInput from "@/components/phone-input";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import Select from "@/components/select";

export default function AddClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [telegram, setTelegram] = useState("");
  const [address, setAddress] = useState("");
  const [inn, setInn] = useState("");
  const [kind, setKind] = useState<"RETAIL" | "RESELLER">("RETAIL");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    if (!name.trim()) {
      setErr("Ismi kiritilishi shart");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CLIENT",
          name,
          phone,
          phone2,
          telegram,
          address,
          inn,
          customerKind: kind,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error?.message ?? "Xato");
        return;
      }
      setOpen(false);
      setName("");
      setPhone("");
      setPhone2("");
      setTelegram("");
      setAddress("");
      setInn("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark"
      >
        <Plus size={16} /> Yangi mijoz
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-panel rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Yangi mijoz qo'shish</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ismi / Kompaniya *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                  placeholder="Alisher / OOO ..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mijoz turi</label>
                <Select
                  value={kind}
                  onChange={(v) => setKind(v as never)}
                  options={[
                    { value: "RETAIL", label: "Chakana" },
                    { value: "RESELLER", label: "Qayta sotuvchi" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Qo'shimcha</label>
                  <PhoneInput
                    value={phone2}
                    onChange={setPhone2}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                    placeholder="ixtiyoriy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telegram</label>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Manzil</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">INN</label>
                <input
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                  placeholder="ixtiyoriy"
                />
              </div>

              {err && (
                <div className="p-2 rounded-lg bg-danger-light/30 border border-danger/40 text-sm text-danger">
                  {err}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
