import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string = "UZS"
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "RUB" ? "₽" : "";
  const suffix = currency === "UZS" ? " so'm" : "";
  const val = new Intl.NumberFormat("ru-RU").format(amount);
  return `${sym}${val}${suffix}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateOrderNumber(prefix = "BZ"): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} kun oldin`;
  return formatDate(d);
}
