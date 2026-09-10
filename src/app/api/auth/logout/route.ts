import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

// Redirect to /login on the SAME PUBLIC origin.
// `req.url` on Railway contains the internal container address (e.g.
// http://0.0.0.0:8080/api/auth/logout) which the browser cannot reach —
// causing chiqish tugma → "ERR_ADDRESS_INVALID".  We build the redirect
// from the incoming `Host` header + the Railway proxy proto header.
function loginUrl(req: Request): string {
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}/login`;
  // Fallback (shouldn't happen in production)
  const u = new URL(req.url);
  u.pathname = "/login";
  u.search = "";
  return u.toString();
}

export async function POST(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(loginUrl(req), 303);
}

export async function GET(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(loginUrl(req), 303);
}
