import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me"
);
const COOKIE_NAME = "oneshop_token";
const EXPIRES = process.env.JWT_EXPIRES_IN ?? "7d";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  customRoleKey?: string | null;
  permissions: string[];
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signToken(user: SessionUser) {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export const COOKIE_KEY = COOKIE_NAME;

// Build a SessionUser from a DB row (login flow)
export async function buildSession(userId: string): Promise<SessionUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { customRole: true },
  });
  if (!u || !u.isActive) return null;
  const perms: string[] =
    (u.customRole?.permissions as string[]) ?? defaultPermissionsForRole(u.role);
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    customRoleKey: u.customRole?.key ?? null,
    permissions: perms,
  };
}

export function defaultPermissionsForRole(role: Role): string[] {
  // Meetingdan (1:13:17 va 1:01:41): har rolga faqat kerakli bo'limlar
  // ko'rinishi kerak. Buxgalter'ga: mijozlar ro'yxati + moliya + hisobot.
  // Sotuvchi: buyurtma + mijoz + CRM + POS. Omborchi: ombor + konteyner.
  switch (role) {
    // ── Bosh admin / Rahbar — barchasi ochiq ──
    case "SUPER_ADMIN":
    case "RAHBAR":
      return ["*"];

    // ── Legacy Admin — deyarli hammasi ochiq ──
    case "ADMIN":
      return [
        "dashboard.read",
        "orders.*", "pos.*",
        "warehouse.*", "catalog.*", "shipments.*",
        "clients.*", "counterparties.*", "crm.*",
        "finance.*", "employees.*", "payroll.*",
        "reports.*", "settings.*",
      ];

    case "MANAGER":
      return [
        "dashboard.read",
        "orders.*", "clients.*", "counterparties.read",
        "crm.*",
        "reports.read",
      ];

    // ── Sotuvchi ── buyurtmalar + mijoz + CRM (kanban) + kassa
    // Eslatma: CRM meeting stenogrammasida tilga olinmagan edi, shuning
    // uchun avval "crm.*" olib tashlangan edi — lekin keyinchalik lead
    // voronkasi (kanban) alohida biznes ehtiyoj sifatida talab qilindi,
    // shuning uchun qaytarildi.
    case "SOTUVCHI":
    case "SELLER":
      return [
        "dashboard.read",
        "orders.read", "orders.write",
        "pos.read", "pos.write",
        "clients.read", "clients.write",
        "counterparties.read",
        "catalog.read",
        "crm.*",
      ];

    // ── Sex mudiri (Alisher aka) ── ishlab chiqarish + ombor + retseptlar
    case "SEX_MUDIRI":
      return [
        "dashboard.read",
        "orders.read", "orders.write",
        "warehouse.read", "warehouse.write",
        "catalog.read", "catalog.write",     // retsept (BOM)
        "shipments.read",
        "employees.read",
      ];

    // ── Omborchi ── ombor + konteyner + katalog + buyurtma (o'qish)
    case "OMBORCHI":
    case "WAREHOUSE":
      return [
        "dashboard.read",
        "warehouse.*", "shipments.*", "catalog.read",
        "orders.read",
      ];

    // ── Buxgalter ── faqat moliya + kontragent + hisobot + mijoz ro'yxati
    // Meetingda aytilgan: unga ombor/buyurtma ko'rinmaydi.  Faqat mijozlar
    // ro'yxati (kim shot-faktura yopdi) + moliya + hisobot.
    case "BUXGALTER":
    case "ACCOUNTANT":
      return [
        "dashboard.read",
        "finance.*",
        "reports.*",
        "clients.read",           // mijozlar ro'yxati (shot-faktura status)
        "counterparties.read",
        "payroll.read",
      ];

    // ── Tashqi (Telegram bot) — web'da hech narsa yo'q ──
    case "TAMINOTCHI":
    case "MIJOZ":
    case "HAYDOVCHI":
      return ["telegram.read"];

    default:
      return ["dashboard.read"];
  }
}

export function hasPermission(user: SessionUser | null, perm: string): boolean {
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  if (user.permissions.includes(perm)) return true;
  const [group] = perm.split(".");
  if (user.permissions.includes(`${group}.*`)) return true;
  return false;
}
