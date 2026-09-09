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

const Create = z.object({
  username: z.string().min(2),
  name: z.string().min(1),
  role: z.enum(ROLES as [Role, ...Role[]]),
  password: z.string().min(4),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("settings.write");
    const body = Create.parse(await req.json());
    const exists = await prisma.user.findUnique({
      where: { username: body.username },
    });
    if (exists)
      return jsonErr("Bu foydalanuvchi allaqachon bor", 409, "USERNAME_TAKEN");
    const user = await prisma.user.create({
      data: {
        username: body.username,
        name: body.name,
        role: body.role,
        password: await hashPassword(body.password),
        isActive: body.isActive,
      },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "CREATE",
        description: `Foydalanuvchi yaratildi: ${user.username}`,
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
