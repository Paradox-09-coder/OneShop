import { NextResponse } from "next/server";

// Saytning hozirgi versiyasi. Ochiq sahifa shuni vaqti-vaqti bilan so'raydi
// (components/update-banner.tsx) va u o'zgarsa — "sayt yangilandi" xabarini
// ko'rsatadi.
//
// Railway har bir deploy uchun yangi RAILWAY_DEPLOYMENT_ID beradi. U bo'lmasa
// (lokal ishlashda) — server ishga tushgan payt: server qayta yoqilganda
// o'zgaradi, bu ham "yangi versiya" degani.
export const dynamic = "force-dynamic";

const BOOT_ID = String(Date.now());

export function GET() {
  return NextResponse.json(
    { version: process.env.RAILWAY_DEPLOYMENT_ID ?? BOOT_ID },
    { headers: { "Cache-Control": "no-store" } }
  );
}
