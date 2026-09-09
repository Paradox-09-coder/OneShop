import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

// Redirect to /login on the same origin.  We must derive origin from the
// incoming request, not from an env var, because Railway sets neither
// NEXT_PUBLIC_APP_URL nor host in a predictable place.
function loginUrl(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/login";
  url.search = "";
  return url;
}

export async function POST(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(loginUrl(req), 303);
}

export async function GET(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(loginUrl(req), 303);
}
