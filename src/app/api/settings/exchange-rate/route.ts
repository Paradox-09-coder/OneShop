import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Body = z.object({ rate: z.number().positive() });

export async function PUT(req: Request) {
  try {
    const session = await requireApiPermission("settings.write");
    const { rate } = Body.parse(await req.json());
    await prisma.setting.upsert({
      where: { key: "exchange_rate_usd" },
      update: { value: { rate } },
      create: { key: "exchange_rate_usd", value: { rate } },
    });
    await prisma.fxRate.create({
      data: {
        base: "USD",
        quote: "UZS",
        rate,
      },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/sozlamalar",
        action: "UPDATE",
        description: `Valyuta kursi: 1 USD = ${rate} UZS`,
      },
    });
    return jsonOk({ rate });
  } catch (e) {
    return handleError(e);
  }
}
