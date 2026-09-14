import type { OrderStatus, OrderType } from "@prisma/client";

// Retail / Wholesale pipeline (Isell'ning haqiqiy bosqichlariga moslashtirildi
// — so'rov/maslahat/narx bosqichlari CRM-lead darajasida, buyurtma tizimga
// "Buyurtma olindi"dan boshlab kiritiladi).
export const RETAIL_FLOW: OrderStatus[] = [
  "BUYURTMA_OLINDI",
  "YETKAZILMOQDA",
  "YAKUNLANDI",
];

// Manufacturing pipeline (Beltech-derived)
export const MANUFACTURING_FLOW: OrderStatus[] = [
  "PROPOSAL",
  "NEW",
  "PROCESSING",
  "READY",
  "DELIVERED",
];

const TERMINAL: OrderStatus[] = ["CANCELLED"];

// Kanban board uchun — ikkala pipeline'ning barcha bosqichlari + bekor
// qilingan, mantiqiy tartibda (chakana/ulgurji oldin, keyin ishlab
// chiqarish, oxirida bekor qilingan).
export const ALL_STAGES_ORDERED: OrderStatus[] = [
  ...RETAIL_FLOW,
  ...MANUFACTURING_FLOW,
  ...TERMINAL,
];

export function stagesFor(type: OrderType): OrderStatus[] {
  switch (type) {
    case "MANUFACTURING":
      return MANUFACTURING_FLOW;
    case "POS":
      return ["YANGI_SOROV", "YAKUNLANDI"];
    case "RETAIL":
    case "WHOLESALE":
    default:
      return RETAIL_FLOW;
  }
}

export function allowedTransitions(
  type: OrderType,
  from: OrderStatus
): OrderStatus[] {
  if (TERMINAL.includes(from)) return [];
  const flow = stagesFor(type);
  const idx = flow.indexOf(from);
  if (idx === -1) return [flow[0], "CANCELLED"];
  const nexts: OrderStatus[] = [];
  if (idx + 1 < flow.length) nexts.push(flow[idx + 1]);
  if (idx > 0) nexts.push(flow[idx - 1]); // allow one step back
  nexts.push("CANCELLED");
  return nexts;
}

export function canTransition(
  type: OrderType,
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return allowedTransitions(type, from).includes(to);
}

// When crossing OUT of "proposal-like" states we commit stock;
// crossing back restores it.
const PROPOSAL_LIKE: OrderStatus[] = ["YANGI_SOROV", "PROPOSAL"];

export function stockChange(
  from: OrderStatus,
  to: OrderStatus
): "commit" | "restore" | "none" {
  const fromProp = PROPOSAL_LIKE.includes(from);
  const toProp = PROPOSAL_LIKE.includes(to);
  if (fromProp && !toProp) return "commit";
  if (!fromProp && toProp) return "restore";
  return "none";
}
