import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, jsonErr, jsonOk, requireApiPermission } from "@/lib/api";

const Patch = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CLIENT", "SUPPLIER", "EMPLOYEE", "FOUNDER", "LENDER", "OTHER"]).optional(),
  phone: z.string().nullish(),
  phone2: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  telegram: z.string().nullish(),
  address: z.string().nullish(),
  inn: z.string().nullish(),
  status: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("counterparties.write");
    const { id } = await params;
    const body = Patch.parse(await req.json());
    const patch: Record<string, unknown> = {};
    if (body.name) patch.name = body.name;
    if (body.type) patch.type = body.type;
    if (body.phone !== undefined) patch.phone = body.phone || null;
    if (body.phone2 !== undefined) patch.phone2 = body.phone2 || null;
    if (body.email !== undefined) patch.email = body.email || null;
    if (body.telegram !== undefined) patch.telegram = body.telegram || null;
    if (body.address !== undefined) patch.address = body.address || null;
    if (body.inn !== undefined) patch.inn = body.inn || null;
    if (body.status) patch.status = body.status;

    const before = await prisma.counterparty.findUnique({
      where: { id },
      select: { type: true, deletedAt: true },
    });
    if (!before || before.deletedAt) return jsonErr("Kontragent topilmadi", 404);

    const party = await prisma.counterparty.update({
      where: { id },
      data: patch,
    });

    // Tur o'zgarganda mos profil bo'lmasa yaratamiz — aks holda, masalan
    // "Mijoz"ga o'tkazilgan kontragentda mijoz profili (kredit limit va h.k.)
    // bo'lmay qoladi. Mavjud profilga tegmaymiz.
    if (body.type && body.type !== before.type) {
      if (body.type === "CLIENT") {
        await prisma.clientProfile.upsert({
          where: { counterpartyId: id },
          create: { counterpartyId: id },
          update: {},
        });
      } else if (body.type === "SUPPLIER") {
        await prisma.supplierProfile.upsert({
          where: { counterpartyId: id },
          create: { counterpartyId: id },
          update: {},
        });
      } else if (body.type === "EMPLOYEE") {
        await prisma.employee.upsert({
          where: { counterpartyId: id },
          create: { counterpartyId: id },
          update: {},
        });
      }
    }
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/kontragentlar",
        action: "UPDATE",
        description: `Kontragent: ${party.name}`,
      },
    });
    return jsonOk({ party });
  } catch (e) {
    return handleError(e);
  }
}

// O'chirish — "yumshoq": yozuv bazadan o'chmaydi, faqat ro'yxatlardan
// yashiriladi (deletedAt). Shunda eski buyurtma/to'lovlar tarixi buzilmaydi.
// Lekin qarzi bor yoki tizim foydalanuvchisiga bog'langan kontragent
// o'chirilmaydi — aks holda qarz hisobotlardan jimgina g'oyib bo'lardi.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("counterparties.write");
    const { id } = await params;

    const party = await prisma.counterparty.findUnique({
      where: { id },
      include: { employee: { select: { userId: true } } },
    });
    if (!party || party.deletedAt) return jsonErr("Kontragent topilmadi", 404);

    if (party.employee?.userId) {
      return jsonErr(
        "Bu xodim tizim foydalanuvchisiga bog'langan — avval Sozlamalar → Foydalanuvchilar bo'limida foydalanuvchini o'chiring yoki bloklang.",
        409
      );
    }
    if (Math.abs(party.balanceValue) > 0.01) {
      return jsonErr(
        `Balans nolga teng emas (${party.balanceValue.toLocaleString("ru-RU")} ${party.balanceCurrency}). Avval hisob-kitobni yoping, keyin o'chiring.`,
        409
      );
    }
    const orders = await prisma.order.findMany({
      where: { clientId: id, status: { not: "CANCELLED" } },
      select: { agreedAmount: true, paidAmount: true },
    });
    const debt = orders.reduce((s, o) => s + ((o.agreedAmount ?? 0) - o.paidAmount), 0);
    if (Math.abs(debt) > 0.01) {
      return jsonErr(
        `Buyurtmalar bo'yicha to'lanmagan qoldiq bor (${debt.toLocaleString("ru-RU")}). Avval hisob-kitobni yoping, keyin o'chiring.`,
        409
      );
    }

    await prisma.counterparty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await prisma.log.create({
      data: {
        userId: session.id,
        screen: "/kontragentlar",
        action: "DELETE",
        description: `Kontragent o'chirildi: ${party.name}`,
      },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
