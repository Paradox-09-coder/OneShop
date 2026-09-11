"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";

type DialogState =
  | { kind: "confirm"; message: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: "alert"; message: string };

// Brauzerning window.confirm()/alert() o'rniga — ular ba'zi mobil
// brauzerlarda ishonchsiz ishlaydi va saytga mos ko'rinmaydi. Har bir
// komponent o'zining useDialog() nusxasini oladi va <Dialog />ni bir marta
// render qiladi.
export function useDialog() {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback(
    (message: string, opts?: { danger?: boolean }) => {
      return new Promise<boolean>((resolve) => {
        setState({ kind: "confirm", message, danger: opts?.danger ?? true, resolve });
      });
    },
    []
  );

  const alert = useCallback((message: string) => {
    setState({ kind: "alert", message });
  }, []);

  function close(result?: boolean) {
    if (state?.kind === "confirm") state.resolve(!!result);
    setState(null);
  }

  const Dialog = !state ? null : (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => close(false)}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          {state.kind === "confirm" && state.danger && (
            <div className="shrink-0 w-9 h-9 rounded-full bg-red-100 text-danger flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          )}
          <p className="text-sm text-ink whitespace-pre-line pt-1">
            {state.message}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          {state.kind === "confirm" && (
            <button
              onClick={() => close(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-gray-50"
            >
              Bekor qilish
            </button>
          )}
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold ${
              state.kind === "confirm" && state.danger
                ? "bg-danger"
                : "bg-primary"
            }`}
          >
            {state.kind === "confirm" ? "Ha, davom etish" : "Tushunarli"}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, alert, Dialog };
}
