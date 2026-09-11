import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  // Logistika
  driverName: z.string().nullable().optional(),
  driverPhone: z.string().nullable().optional(),
  driverCarNumber: z.string().nullable().optional(),
  deliveryCost: z.number().nullable().optional(),
  deliveryPaidToId: z.string().nullable().optional(),
  deliveryPaidAt: z.string().nullable().optional(),
  receiverName: z.string().nullable().optional(),
  receiverPhone: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),

  // Umumiy
  note: z.string().optional(),
  expectedDeliveryDate: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  priority: z.enum(["NORMAL", "HIGH", "VIP"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("orders.read");
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        items: { include: { catalogProduct: true } },
        payments: true,
        statusHistory: true,
      },
    });
    return jsonOk({ order });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("orders.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());

    const patch: Record<string, unknown> = {};
    if (body.driverName !== undefined) patch.driverName = body.driverName;
    if (body.driverPhone !== undefined) patch.driverPhone = body.driverPhone;
    if (body.driverCarNumber !== undefined) patch.driverCarNumber = body.driverCarNumber;
    if (body.deliveryCost !== undefined) patch.deliveryCost = body.deliveryCost;
    if (body.deliveryPaidToId !== undefined) patch.deliveryPaidToId = body.deliveryPaidToId;
    if (body.deliveryPaidAt !== undefined)
      patch.deliveryPaidAt = body.deliveryPaidAt ? new Date(body.deliveryPaidAt) : null;
    if (body.receiverName !== undefined) patch.receiverName = body.receiverName;
    if (body.receiverPhone !== undefined) patch.receiverPhone = body.receiverPhone;
    if (body.deliveredAt !== undefined)
      patch.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null;
    if (body.note !== undefined) patch.note = body.note;
    if (body.expectedDeliveryDate !== undefined)
      patch.expectedDeliveryDate = body.expectedDeliveryDate
        ? new Date(body.expectedDeliveryDate)
        : null;
    if (body.deliveryAddress !== undefined) patch.deliveryAddress = body.deliveryAddress;
    if (body.priority !== undefined) patch.priority = body.priority;

    const order = await prisma.order.update({ where: { id }, data: patch });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: `/buyurtmalar/${id}`,
        action: "UPDATE",
        description: `Buyurtma ${order.orderNumber} yangilandi`,
      },
    });
    return jsonOk({ order });
  } catch (e) {
    return handleError(e);
  }
}
