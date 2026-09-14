import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";
import type { Role } from "@prisma/client";

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "USER",
  "RAHBAR",
  "SOTUVCHI",
  "SEX_MUDIRI",
  "OMBORCHI",
  "BUXGALTER",
  "TAMINOTCHI",
  "MIJOZ",
  "HAYDOVCHI",
  "SELLER",
  "WAREHOUSE",
  "ACCOUNTANT",
];

const Patch = z.object({
  username: z.string().min(2).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  password: z.string().min(4).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("settings.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const patch: Record<string, unknown> = {};
    if (body.username) patch.username = body.username;
    if (body.name) patch.name = body.name;
    if (body.role) patch.role = body.role;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (body.password) patch.password = await hashPassword(body.password);
    const user = await prisma.user.update({ where: { id }, data: patch });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "UPDATE",
        description: `Foydalanuvchi: ${user.username}`,
      },
    });
    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("settings.write");
    const { id } = await params;
    if (id === session.id) {
      return jsonErr("O'zingizni o'chira olmaysiz", 422);
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonErr("Foydalanuvchi topilmadi", 404);

    try {
      await prisma.user.delete({ where: { id } });
    } catch {
      // Bu foydalanuvchi buyurtma/to'lov/log kabi yozuvlarga bog'langan —
      // hard delete FK cheklovi tufayli rad etiladi. Bunday holatda
      // "Bloklangan" (isActive=false) qilish tavsiya etiladi.
      return jsonErr(
        "Bu foydalanuvchi bilan bog'liq yozuvlar bor (buyurtmalar, to'lovlar va h.k.) — o'chirib bo'lmaydi. Buning o'rniga uni \"Bloklangan\" holatiga o'tkazing.",
        409
      );
    }

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "DELETE",
        description: `Foydalanuvchi o'chirildi: ${user.username}`,
      },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
