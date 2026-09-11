"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useDialog } from "@/components/use-dialog";

interface CatRow {
  id: string;
  name: string;
  sortOrder: number;
}

interface Draft {
  id?: string;
  name: string;
  sortOrder: number;
}

export default function CategoriesManager({ categories }: { categories: CatRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, alert, Dialog } = useDialog();

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return setErr("Nom kiriting");
    setSaving(true);
    setErr(null);
    try {
      const res = draft.id
        ? await fetch(`/api/product-categories/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/product-categories", {
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
    if (!(await confirm(`"${name}" kategoriyasini o'chirmoqchimisiz?`))) return;
    const res = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.ok) return alert(d.error?.message ?? "O'chirib bo'lmadi");
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() =>
            setDraft({ name: "", sortOrder: categories.length })
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
        >
          <Plus size={14} /> Yangi kategoriya
        </button>
      </div>

      <ul className="divide-y divide-border">
        {categories.map((c) => (
          <li key={c.id} className="py-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-ink-soft">Tartib: {c.sortOrder}</p>
            </div>
            <div>
              <button
                onClick={() =>
                  setDraft({ id: c.id, name: c.name, sortOrder: c.sortOrder })
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 text-primary"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => remove(c.id, c.name)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="py-6 text-center text-ink-soft text-sm">Bo'sh</li>
        )}
      </ul>

      {draft && (
        <Modal
          title={draft.id ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
          onClose={() => setDraft(null)}
        >
          <div className="space-y-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nomi (Generatorlar)"
              className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              autoFocus
            />
            <div>
              <label className="block text-xs text-ink-soft mb-1">Tartib raqami</label>
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-border bg-white"
              />
            </div>
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
