import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Create = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  note: z.string().optional(),
});

function makeTransferNo() {
  const now = new Date();
  return `TR-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function POST(req: Request) {
  try {
    const session = await requireApiPermission("warehouse.write");
    const body = Create.parse(await req.json());
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber: makeTransferNo(),
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        note: body.note,
        createdById: session.id,
      },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/filiallar",
        action: "CREATE",
        description: `Ichki o'tkazma: ${transfer.transferNumber}`,
      },
    });
    return jsonOk({ transfer });
  } catch (e) {
    return handleError(e);
  }
}
