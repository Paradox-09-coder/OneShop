import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, hasPermission, type SessionUser } from "./auth";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonErr(
  message: string,
  status = 400,
  code?: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { ok: false, error: { message, code, ...extra } },
    { status }
  );
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    // Xato yagona field bo'lsa, uni foydalanuvchiga tushunarli qilib chiqarish
    const first = e.issues[0];
    const field = first?.path?.join(".") || "";
    const detail = first?.message || "";
    const message = field
      ? `Validatsiya xatosi: "${field}" — ${detail}`
      : `Validatsiya xatosi: ${detail}`;
    return jsonErr(message, 422, "VALIDATION", { issues: e.issues });
  }
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return jsonErr("Avtorizatsiya talab qilinadi", 401, "UNAUTHORIZED");
  }
  if (e instanceof Error && e.message === "FORBIDDEN") {
    return jsonErr("Ruxsat yo'q", 403, "FORBIDDEN");
  }
  const msg = e instanceof Error ? e.message : "Server xatosi";
  console.error("[API]", e);
  return jsonErr(msg, 500, "INTERNAL");
}

export async function requireApiSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireApiPermission(perm: string): Promise<SessionUser> {
  const s = await requireApiSession();
  if (!hasPermission(s, perm)) throw new Error("FORBIDDEN");
  return s;
}
