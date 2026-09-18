"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Yuklanmoqda...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function DemoRow({
  login,
  pw,
  role,
  onPick,
}: {
  login: string;
  pw: string;
  role: string;
  onPick: (u: string, p: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(login, pw)}
      className="w-full flex justify-between items-center p-1.5 rounded-lg hover:bg-white transition text-left"
      title="Bosing — maydonlarga qo'yamiz"
    >
      <span>
        <span className="text-primary font-bold">{login}</span>{" "}
        <span className="text-ink-soft">/ {pw}</span>
      </span>
      <span className="text-ink-soft text-[10px]">{role}</span>
    </button>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Kirish amalga oshmadi");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Server bilan ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-bg">
      <div className="w-full max-w-md panel p-8">
        <div className="text-center mb-6">
          <Image
            src="/logo.png"
            alt="OneShop ERP"
            width={1090}
            height={330}
            className="h-12 w-auto mx-auto mb-3"
            priority
          />
          <p className="text-sm text-ink-soft mt-1">Tizimga kirish</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Foydalanuvchi nomi
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Parol</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger-light/30 border border-danger/40 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Kirish..." : "Kirish"}
          </button>
        </form>

        <details className="mt-6 text-xs text-ink-soft">
          <summary className="cursor-pointer text-center font-semibold hover:text-primary">
            Demo hisoblar (bosib ko'ring)
          </summary>
          <div className="mt-3 space-y-1 font-mono text-[11px] bg-gray-50 rounded-xl p-3">
            <DemoRow login="admin" pw="admin123" role="Bosh administrator" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
            <DemoRow login="rahbar" pw="rahbar123" role="Rahbar (egasi)" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
            <DemoRow login="sotuvchi" pw="sotuvchi123" role="Sotuvchi / Menejer" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
            <DemoRow login="alisher" pw="alisher123" role="Sex mudiri" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
            <DemoRow login="omborchi" pw="omborchi123" role="Omborchi" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
            <DemoRow login="buxgalter" pw="buxgalter123" role="Buxgalter" onPick={(u, p) => { setUsername(u); setPassword(p); }} />
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-soft">
            Ta'minotchi / Mijoz / Haydovchi rollari — Telegram bot orqali (@oneshop_erp_bot)
          </p>
        </details>
      </div>
    </div>
  );
}
