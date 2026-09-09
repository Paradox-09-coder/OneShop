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
  switch (role) {
    // Full access — director / super admin
    case "SUPER_ADMIN":
    case "RAHBAR":
      return ["*"];
    case "ADMIN":
      return [
        "orders.*", "warehouse.*", "clients.*", "counterparties.*",
        "finance.*", "crm.*", "employees.*", "reports.*", "settings.*",
      ];
    // Manager — legacy
    case "MANAGER":
      return ["orders.*", "clients.*", "crm.*", "reports.read"];
    // Seller — sotuvchi
    case "SOTUVCHI":
    case "SELLER":
      return [
        "orders.read", "orders.write",
        "clients.read", "clients.write",
        "counterparties.read",
        "crm.*", "pos.*",
      ];
    // Production manager — sex mudiri (Alisher aka)
    case "SEX_MUDIRI":
      return [
        "orders.read", "orders.write",     // manufacturing orders
        "warehouse.read", "warehouse.write",
        "production.*",
        "employees.read",                   // sees team
      ];
    // Warehouse keeper — omborchi
    case "OMBORCHI":
    case "WAREHOUSE":
      return [
        "warehouse.*",
        "shipments.*",
        "orders.read",
        "catalog.read",
      ];
    // Accountant — buxgalter
    case "BUXGALTER":
    case "ACCOUNTANT":
      return [
        "finance.*",
        "reports.*",
        "counterparties.read",
        "orders.read",
        "payroll.*",
      ];
    // External-only (Telegram bot users) — no web access
    case "TAMINOTCHI":
    case "MIJOZ":
    case "HAYDOVCHI":
      return ["telegram.read"];  // no web modules
    default:
      return ["orders.read", "warehouse.read"];
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
