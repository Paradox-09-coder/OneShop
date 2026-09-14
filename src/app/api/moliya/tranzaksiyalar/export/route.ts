import { prisma } from "@/lib/prisma";
import { handleError, requireApiPermission } from "@/lib/api";
import { paymentTxLabel, paymentSourceLabel } from "@/lib/labels";
import type { PaymentTxType, Prisma } from "@prisma/client";

function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    await requireApiPermission("finance.read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const type = url.searchParams.get("type") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    const where: Prisma.PaymentWhereInput = {
      ...(type ? { type: type as PaymentTxType } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { counterpartyNameSnapshot: { contains: q, mode: "insensitive" } },
              { counterparty: { is: { name: { contains: q, mode: "insensitive" } } } },
              { category: { is: { name: { contains: q, mode: "insensitive" } } } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      take: 5000,
      include: {
        account: { select: { name: true } },
        counterparty: { select: { name: true } },
      },
    });

    const header = ["Sana", "Tur", "Kategoriya", "Kontragent", "Manba", "Hisob", "Summa", "Valyuta", "Izoh"];
    const isIn = (t: string) => t === "CASH_IN" || t === "BANK_IN";
    const rows = payments.map((p) => [
      p.date.toISOString().slice(0, 10),
      isIn(p.type) ? "Kirim" : "Chiqim",
      paymentTxLabel[p.type],
      p.counterparty?.name ?? p.counterpartyNameSnapshot ?? "—",
      paymentSourceLabel[p.sourceType],
      p.account?.name ?? "—",
      String(p.amount),
      p.currency,
      p.description ?? "",
    ]);

    const csv =
      "﻿" +
      [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tranzaksiyalar-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
