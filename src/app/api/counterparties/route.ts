import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  name: z.string().min(1),
  type: z.enum(["CLIENT", "SUPPLIER", "EMPLOYEE", "FOUNDER", "LENDER", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  customerKind: z.enum(["RETAIL", "RESELLER"]).optional(),
});

export async function GET(req: Request) {
  try {
    await requireApiPermission("counterparties.read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const parties = await prisma.counterparty.findMany({
      where: {
        deletedAt: null,
        ...(type ? { type: type as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return jsonOk({ parties });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("counterparties.write");
    const body = Create.parse(await req.json());

    const party = await prisma.counterparty.create({
      data: {
        type: body.type,
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        ...(body.type === "CLIENT" && body.customerKind
          ? {
              clientProfile: {
                create: { customerKind: body.customerKind },
              },
            }
          : {}),
        ...(body.type === "SUPPLIER"
          ? { supplierProfile: { create: {} } }
          : {}),
      },
    });

    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/kontragentlar",
        action: "CREATE",
        description: `${body.type}: ${body.name}`,
      },
    });

    return jsonOk({ party });
  } catch (e) {
    return handleError(e);
  }
}
