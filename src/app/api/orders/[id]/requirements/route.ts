import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireApiPermission } from "@/lib/api";
import { computeRecipeRequirements } from "@/lib/production";

// Buyurtma uchun retsept (BOM) asosida qancha xomashyo kerakligini va
// yetarlimi-yo'qligini ko'rsatadi — hech narsani o'zgartirmaydi (advisory,
// Acham'ning "max producible" hisoblash naqshiga o'xshash).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("orders.read");
    const { id } = await params;
    const requirements = await prisma.$transaction((tx) =>
      computeRecipeRequirements(tx, id)
    );
    return jsonOk({ requirements });
  } catch (e) {
    return handleError(e);
  }
}
