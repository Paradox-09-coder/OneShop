"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { accountTypeLabel } from "@/lib/labels";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useDialog } from "@/components/use-dialog";
import Select from "@/components/select";

type AccountType = "CASH" | "BANK";
type Currency = "UZS" | "USD" | "EUR" | "RUB";

interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balanceCache: number;
  isActive: boolean;
}

interface Draft {
  id?: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balanceCache: number;
  isActive: boolean;
}

const EMPTY: Draft = {
  name: "",
  type: "CASH",
  currency: "UZS",
  balanceCache: 0,
  isActive: true,
};

export default function AccountsManager({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { confirm, alert, Dialog } = useDialog();

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return setErr("Nomi kiritilishi shart");
    setErr(null);
    setSaving(true);
    try {
      const res = draft.id
        ? await fetch(`/api/accounts/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      const data = await res.json();
      if (!data.ok) return setErr(data.error?.message ?? "Xato");
      setDraft(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!(await confirm(`"${name}" hisobini o'chirmoqchimisiz?`))) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error?.message ?? "O'chirib bo'lmadi");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
        >
          <Plus size={14} /> Yangi hisob
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-soft uppercase border-b border-border">
            <th className="text-left py-2">Nomi</th>
            <th className="text-left py-2">Turi</th>
            <th className="text-left py-2">Valyuta</th>
            <th className="text-right py-2">Balans</th>
            <th className="text-center py-2">Holat</th>
            <th className="text-right py-2">Amal</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-border/50">
              <td className="py-2 font-semibold">{a.name}</td>
              <td className="py-2">{accountTypeLabel[a.type]}</td>
              <td className="py-2">{a.currency}</td>
              <td className="py-2 text-right font-bold">
                {formatMoney(a.balanceCache, a.currency)}
              </td>
              <td className="py-2 text-center">
                {a.isActive ? (
                  <span className="chip bg-emerald-100 text-emerald-700">Faol</span>
                ) : (
                  <span className="chip bg-gray-100 text-gray-700">Yopiq</span>
                )}
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() =>
                    setDraft({
                      id: a.id,
                      name: a.name,
                      type: a.type,
                      currency: a.currency,
                      balanceCache: a.balanceCache,
                      isActive: a.isActive,
                    })
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-primary"
                  title="O'zgartirish"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(a.id, a.name)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-danger"
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-ink-soft">
                Hisoblar yo'q — yuqorida "Yangi hisob"
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {draft && (
        <Modal
          title={draft.id ? "Hisobni tahrirlash" : "Yangi hisob"}
          onClose={() => setDraft(null)}
        >
          <div className="space-y-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nomi (Asosiy kassa)"
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={draft.type}
                onChange={(v) => setDraft({ ...draft, type: v as AccountType })}
                options={[
                  { value: "CASH", label: "Kassa" },
                  { value: "BANK", label: "Bank" },
                ]}
              />
              <Select
                value={draft.currency}
                onChange={(v) => setDraft({ ...draft, currency: v as Currency })}
                options={[
                  { value: "UZS", label: "so'm" },
                  { value: "USD", label: "$" },
                  { value: "EUR", label: "€" },
                  { value: "RUB", label: "₽" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs text-ink-soft mb-1">Boshlang'ich balans</label>
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                value={draft.balanceCache}
                onChange={(e) =>
                  setDraft({ ...draft, balanceCache: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              />
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              <span className="text-sm">Faol</span>
            </label>
            {err && (
              <div className="p-2 rounded-lg bg-danger-light/30 text-danger text-sm">
                {err}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDraft(null)}
                className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Bekor
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "..." : "Saqlash"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {Dialog}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
