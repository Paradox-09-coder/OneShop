"use client";

import { useState, type FormEvent } from "react";
import PhoneInput from "@/components/phone-input";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import Select from "@/components/select";

interface CreatedParty {
  id: string;
  name: string;
  phone: string | null;
  carNumber: string | null;
}

const POSITION_OPTIONS = [
  "Haydovchi",
  "Sotuvchi",
  "Menejer",
  "Buxgalter",
  "Omborchi",
  "Ishchi",
  "Boshqa",
];

interface Props {
  // Boshlang'ich kontragent turi — masalan Xodimlar sahifasidan yoki
  // haydovchi tanlagichdan ochilganda to'g'ridan-to'g'ri "Xodim".
  defaultType?: "CLIENT" | "SUPPLIER" | "EMPLOYEE" | "FOUNDER" | "LENDER" | "OTHER";
  // true bo'lsa — turi tanlagichi ko'rsatilmaydi (kontekst allaqachon aniq).
  lockType?: boolean;
  defaultPosition?: string;
  label?: string;
  title?: string;
  // "button" — katta ko'k tugma (ro'yxat sahifalari uchun). "link" — kichik
  // matnli havola (forma ichida, masalan Yetkazish panelidagi haydovchi
  // tanlagich ostida "+ Yangi haydovchi").
  variant?: "button" | "link";
  onCreated?: (party: CreatedParty) => void;
}

export default function AddCounterpartyButton({
  defaultType = "CLIENT",
  lockType = false,
  defaultPosition = "",
  label,
  title,
  variant = "button",
  onCreated,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(defaultType);
  const [phone, setPhone] = useState("");
  const [customerKind, setCustomerKind] = useState("RETAIL");
  const [position, setPosition] = useState(defaultPosition);
  const [customPosition, setCustomPosition] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setType(defaultType);
    setPhone("");
    setCustomerKind("RETAIL");
    setPosition(defaultPosition);
    setCustomPosition("");
    setCarNumber("");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const finalPosition = position === "Boshqa" ? customPosition : position;
      const res = await fetch("/api/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          phone,
          customerKind,
          position: finalPosition,
          carNumber,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Xato");
        return;
      }
      setOpen(false);
      const created = data.data?.party;
      const savedName = name;
      const savedPhone = phone;
      const savedCarNumber = carNumber;
      reset();
      router.refresh();
      if (created) {
        onCreated?.({
          id: created.id,
          name: savedName,
          phone: savedPhone || null,
          carNumber: savedCarNumber || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const modalTitle = title ?? label ?? "Yangi kontragent";

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Plus size={14} /> {label ?? "Yangi qo'shish"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark"
        >
          <Plus size={16} /> {label ?? "Yangi kontragent"}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={onSubmit}
            className="bg-panel rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{modalTitle}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Ismi / Nomi</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                />
              </div>
              {!lockType && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontragent turi</label>
                  <Select
                    value={type}
                    onChange={(v) => setType(v as typeof type)}
                    options={[
                      { value: "CLIENT", label: "Mijoz" },
                      { value: "SUPPLIER", label: "Ta'minotchi" },
                      { value: "EMPLOYEE", label: "Xodim" },
                      { value: "FOUNDER", label: "Ta'sischi" },
                      { value: "LENDER", label: "Kreditor" },
                      { value: "OTHER", label: "Boshqa" },
                    ]}
                  />
                </div>
              )}
              {type === "CLIENT" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Mijoz turi</label>
                  <Select
                    value={customerKind}
                    onChange={setCustomerKind}
                    options={[
                      { value: "RETAIL", label: "Chakana" },
                      { value: "RESELLER", label: "Qayta sotuvchi" },
                    ]}
                  />
                </div>
              )}
              {type === "EMPLOYEE" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Lavozimi</label>
                    <Select
                      value={position}
                      onChange={setPosition}
                      placeholder="— tanlang —"
                      options={POSITION_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    />
                  </div>
                  {position === "Boshqa" && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Lavozim nomi
                      </label>
                      <input
                        value={customPosition}
                        onChange={(e) => setCustomPosition(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                        placeholder="Lavozimni yozing"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Mashina raqami (ixtiyoriy)
                    </label>
                    <input
                      value={carNumber}
                      onChange={(e) => setCarNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                      placeholder="01A123BB"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
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
