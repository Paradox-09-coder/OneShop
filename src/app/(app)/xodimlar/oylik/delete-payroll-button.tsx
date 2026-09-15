"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useDialog } from "@/components/use-dialog";

export default function DeletePayrollButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const router = useRouter();
  const { confirm, alert, Dialog } = useDialog();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = await confirm(
      `"${label}" o'chirilsinmi?\nSummasi tegishli hisobga qaytariladi.`,
      { danger: true }
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/xodimlar/oylik/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error?.message ?? "Xatolik yuz berdi");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-ink-soft hover:text-danger disabled:opacity-50"
        title="O'chirish"
      >
        <Trash2 size={14} />
      </button>
      {Dialog}
    </>
  );
}
