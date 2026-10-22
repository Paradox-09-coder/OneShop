"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@prisma/client";
import { Plus, Pencil, Trash2, X, ShieldCheck } from "lucide-react";
import { useDialog } from "@/components/use-dialog";
import Select from "@/components/select";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: Role;
  customRoleLabel: string | null;
  isActive: boolean;
}
interface Draft {
  id?: string;
  username: string;
  name: string;
  role: Role;
  password: string;
  isActive: boolean;
}

const ROLES: Role[] = [
  "RAHBAR",
  "SOTUVCHI",
  "SEX_MUDIRI",
  "OMBORCHI",
  "BUXGALTER",
  "TAMINOTCHI",
  "MIJOZ",
  "HAYDOVCHI",
  "USER",
];

const EMPTY: Draft = {
  username: "",
  name: "",
  role: "SOTUVCHI",
  password: "",
  isActive: true,
};

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, alert, Dialog } = useDialog();

  async function handleDelete(u: UserRow) {
    const ok = await confirm(
      `"${u.name}" (${u.username}) foydalanuvchisini butunlay o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`,
      { danger: true }
    );
    if (!ok) return;
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!d.ok) {
        alert(d.error?.message ?? "Xatolik yuz berdi");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.username.trim()) return setErr("Foydalanuvchi nomi kerak");
    if (!draft.name.trim()) return setErr("Ismi kerak");
    if (!draft.id && !draft.password) return setErr("Parol kerak");
    setSaving(true);
    setErr(null);
    try {
      const res = draft.id
        ? await fetch(`/api/users/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      const d = await res.json();
      if (!d.ok) return setErr(d.error?.message ?? "Xato");
      setDraft(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {Dialog}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
        >
          <Plus size={14} /> Yangi foydalanuvchi
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-soft uppercase border-b border-border">
            <th className="text-left py-2">Foydalanuvchi</th>
            <th className="text-left py-2">Ismi</th>
            <th className="text-left py-2">Rol</th>
            <th className="text-center py-2">Holat</th>
            <th className="text-right py-2">Amal</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/50">
              <td className="py-2 font-mono text-primary">{u.username}</td>
              <td className="py-2 font-semibold">{u.name}</td>
              <td className="py-2">
                <span className="chip bg-primary/10 text-primary">
                  <ShieldCheck size={11} />
                  <span className="ml-1">
                    {u.customRoleLabel ?? roleLabel[u.role]}
                  </span>
                </span>
              </td>
              <td className="py-2 text-center">
                {u.isActive ? (
                  <span className="chip bg-emerald-100 text-emerald-700">Faol</span>
                ) : (
                  <span className="chip bg-rose-100 text-rose-700">Bloklangan</span>
                )}
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() =>
                    setDraft({
                      id: u.id,
                      username: u.username,
                      name: u.name,
                      role: u.role,
                      password: "",
                      isActive: u.isActive,
                    })
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-primary"
                  title="Tahrirlash"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  disabled={deletingId === u.id}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-danger disabled:opacity-50"
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-panel rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                {draft.id ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
              </h3>
              <button
                onClick={() => setDraft(null)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draft.username}
                  onChange={(e) =>
                    setDraft({ ...draft, username: e.target.value })
                  }
                  placeholder="Foydalanuvchi (login)"
                  className="px-3 py-2 rounded-xl border border-border bg-panel"
                  autoFocus
                />
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="To'liq ismi"
                  className="px-3 py-2 rounded-xl border border-border bg-panel"
                />
              </div>
              <Select
                value={draft.role}
                onChange={(v) => setDraft({ ...draft, role: v as Role })}
                options={ROLES.map((r) => ({ value: r, label: roleLabel[r] }))}
              />
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  {draft.id
                    ? "Yangi parol — faqat parolni o'zgartirmoqchi bo'lsangiz to'ldiring"
                    : "Parol"}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={draft.password}
                  onChange={(e) =>
                    setDraft({ ...draft, password: e.target.value })
                  }
                  placeholder={draft.id ? "Bo'sh qoldirsangiz, parol o'zgarmaydi" : "Parol"}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-panel"
                />
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft({ ...draft, isActive: e.target.checked })
                  }
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
          </div>
        </div>
      )}
    </div>
  );
}
