import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  name: z.string().min(1),
  type: z.enum(["CASH", "BANK"]),
  currency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  balanceCache: z.number().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireApiPermission("finance.read");
    const accounts = await prisma.account.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return jsonOk({ accounts });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("finance.write");
    const body = Create.parse(await req.json());
    const account = await prisma.account.create({ data: body });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "CREATE",
        description: `Hisob yaratildi: ${account.name}`,
      },
    });
    return jsonOk({ account });
  } catch (e) {
    return handleError(e);
  }
}
