import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildSession,
  setSessionCookie,
  signToken,
  verifyPassword,
} from "@/lib/auth";
import { handleError, jsonErr, jsonOk } from "@/lib/api";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { username: body.username },
    });
    if (!user || !user.isActive) {
      return jsonErr("Foydalanuvchi topilmadi yoki faol emas", 401, "INVALID_CREDENTIALS");
    }
    const ok = await verifyPassword(body.password, user.password);
    if (!ok) return jsonErr("Parol noto'g'ri", 401, "INVALID_CREDENTIALS");

    const session = await buildSession(user.id);
    if (!session) return jsonErr("Sessiya yaratib bo'lmadi", 500);

    const token = await signToken(session);
    await setSessionCookie(token);
    await prisma.log.create({
      data: {
        userId: user.id,
        screen: "/login",
        action: "LOGIN",
        description: `${user.username} tizimga kirdi`,
      },
    });
    return jsonOk({ user: session });
  } catch (e) {
    return handleError(e);
  }
}
