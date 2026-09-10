import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

// Nakladnoy — HTML sifatida qaytariladi.
// Brauzer o'zi Ctrl+P → "Save as PDF" bilan PDF'ga aylantiradi.
// (Serverda PDF generatsiya native bo'lmasa ham, HTML → print flow yaxshi ishlaydi)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", "http://x"), 303);

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: { include: { catalogProduct: true } },
      seller: true,
    },
  });
  if (!order) return new NextResponse("Buyurtma topilmadi", { status: 404 });

  const company = await prisma.setting.findUnique({
    where: { key: "company_info" },
  });
  const info = (company?.value as {
    name?: string;
    phone?: string;
    address?: string;
  } | null) ?? {};

  const total = order.items.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );
  const cur = order.orderCurrency;
  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU").format(Math.round(n));
  const fmtDate = (d: Date | null | undefined) =>
    d
      ? new Intl.DateTimeFormat("uz-UZ", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(d))
      : "____________";

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Nakladnoy ${order.orderNumber}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", serif;
    padding: 30px;
    color: #000;
    line-height: 1.4;
  }
  h1 { text-align: center; margin: 10px 0 20px; font-size: 22px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .company { font-weight: bold; }
  .meta { text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .box { border: 1px solid #000; padding: 10px; }
  .box h3 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f0f0f0; font-weight: bold; }
  .num { text-align: right; }
  .total-row { font-weight: bold; background: #f8f8f8; }
  .signatures { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 12px; }
  .print-btn {
    position: fixed; top: 15px; right: 15px;
    background: #7c3aed; color: white; border: none;
    padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;
  }
  @media print {
    .print-btn { display: none; }
    body { padding: 20px; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨 Chop etish / PDF</button>

<div class="header">
  <div class="company">
    ${info.name ?? "OneShop MChJ"}<br>
    ${info.address ?? "Toshkent, O'zbekiston"}<br>
    Tel: ${info.phone ?? "+998 71 200 00 00"}
  </div>
  <div class="meta">
    <b>NAKLADNOY № ${order.orderNumber}</b><br>
    Sana: ${fmtDate(order.createdAt)}
    ${order.contractNumber ? `<br>Shartnoma: ${order.contractNumber}` : ""}
  </div>
</div>

<h1>MAHSULOT YETKAZISH NAKLADNOYI</h1>

<div class="grid">
  <div class="box">
    <h3>Mijoz (qabul qiluvchi)</h3>
    <b>${order.client?.name ?? order.clientNameSnapshot ?? "—"}</b><br>
    ${order.client?.address ?? ""}<br>
    Tel: ${order.client?.phone ?? order.clientPhoneSnapshot ?? "—"}<br>
    ${order.client?.inn ? `INN: ${order.client.inn}` : ""}
  </div>
  <div class="box">
    <h3>Yetkazish</h3>
    Haydovchi: <b>${order.driverName ?? "____________"}</b><br>
    Telefon: ${order.driverPhone ?? "____________"}<br>
    Mashina raqami: <b>${order.driverCarNumber ?? "____________"}</b><br>
    Rejalashtirilgan sana: ${fmtDate(order.expectedDeliveryDate)}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px">№</th>
      <th>Mahsulot nomi</th>
      <th class="num" style="width:80px">Miqdor</th>
      <th style="width:60px">Birligi</th>
      <th class="num" style="width:120px">Narx</th>
      <th class="num" style="width:140px">Summa</th>
    </tr>
  </thead>
  <tbody>
    ${order.items
      .map(
        (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.productNameSnapshot}</td>
        <td class="num">${fmt(it.quantity)}</td>
        <td>${it.unitType.toLowerCase()}</td>
        <td class="num">${fmt(it.unitPrice)} ${cur}</td>
        <td class="num">${fmt(it.quantity * it.unitPrice)} ${cur}</td>
      </tr>
    `
      )
      .join("")}
    <tr class="total-row">
      <td colspan="5" class="num">JAMI:</td>
      <td class="num">${fmt(total)} ${cur}</td>
    </tr>
    ${
      order.deliveryCost
        ? `<tr>
      <td colspan="5" class="num">Yetkazish:</td>
      <td class="num">${fmt(order.deliveryCost)} ${cur}</td>
    </tr>`
        : ""
    }
  </tbody>
</table>

<div class="signatures">
  <div>
    <div class="sig">Topshirdi (${info.name ?? "OneShop"})</div>
    ${order.seller?.name ? `<div style="text-align:center;margin-top:5px;font-size:11px">${order.seller.name}</div>` : ""}
  </div>
  <div>
    <div class="sig">Qabul qildi (${order.client?.name ?? "mijoz"})</div>
    ${order.receiverName ? `<div style="text-align:center;margin-top:5px;font-size:11px">${order.receiverName}</div>` : ""}
  </div>
</div>

<script>
  // Auto-focus print dialog on load if ?autoprint=1
  if (window.location.search.includes('autoprint=1')) {
    setTimeout(() => window.print(), 500);
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
