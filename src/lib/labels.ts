// Uzbek labels for enums.  Central place so translations live in one file.

import type {
  OrderStatus,
  OrderType,
  OrderPriority,
  OrderChannel,
  FulfillmentType,
  PaymentType,
  PaymentTxType,
  PaymentSource,
  ShipmentStatus,
  RollStatus,
  UnitType,
  MovementType,
  CounterpartyType,
  AccountType,
  Currency,
  Role,
  NotificationType,
  CustomerKind,
  CrmFunnel,
  PaymentScheduleItemStatus,
} from "@prisma/client";

export const orderStatusLabel: Record<OrderStatus, string> = {
  YANGI_SOROV: "Yangi so'rov",
  MASLAHAT_BERILDI: "Maslahat berildi",
  NARX_KELISHILDI: "Narx kelishildi",
  BUYURTMA_OLINDI: "Buyurtma olindi",
  YETKAZILMOQDA: "Yetkazilmoqda",
  YAKUNLANDI: "Yakunlandi",
  PROPOSAL: "Taklif",
  NEW: "Yangi",
  PROCESSING: "Ishlanmoqda",
  READY: "Tayyor",
  DELIVERED: "Yetkazildi",
  CANCELLED: "Bekor qilindi",
};

export const orderStatusColor: Record<OrderStatus, string> = {
  YANGI_SOROV: "bg-slate-100 text-slate-700",
  MASLAHAT_BERILDI: "bg-sky-100 text-sky-700",
  NARX_KELISHILDI: "bg-indigo-100 text-indigo-700",
  BUYURTMA_OLINDI: "bg-violet-100 text-violet-700",
  YETKAZILMOQDA: "bg-amber-100 text-amber-700",
  YAKUNLANDI: "bg-emerald-100 text-emerald-700",
  PROPOSAL: "bg-slate-100 text-slate-700",
  NEW: "bg-sky-100 text-sky-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  READY: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export const orderTypeLabel: Record<OrderType, string> = {
  RETAIL: "Chakana",
  WHOLESALE: "Ulgurji",
  MANUFACTURING: "Ishlab chiqarish",
  POS: "Kassa",
};

export const orderPriorityLabel: Record<OrderPriority, string> = {
  NORMAL: "Odatiy",
  HIGH: "Yuqori",
  VIP: "VIP",
};

export const orderChannelLabel: Record<OrderChannel, string> = {
  INSTAGRAM: "Instagram",
  TELEGRAM: "Telegram",
  PHONE: "Telefon",
  WALK_IN: "Do'kondan",
  WEBSITE: "Sayt",
  OTHER: "Boshqa",
};

export const fulfillmentLabel: Record<FulfillmentType, string> = {
  DELIVERY: "Yetkazish",
  PICKUP: "O'zi olib ketadi",
};

export const paymentTypeLabel: Record<PaymentType, string> = {
  FULL: "To'liq to'lov",
  PARTIAL: "Qisman to'lov",
  DEFERRED: "Kechiktirilgan",
  INSTALLMENT: "Bo'lib to'lash",
  NOT_CONFIRMED: "Tasdiqlanmagan",
};

export const paymentTxLabel: Record<PaymentTxType, string> = {
  CASH_IN: "Kassa kirim",
  CASH_OUT: "Kassa chiqim",
  BANK_IN: "Bank kirim",
  BANK_OUT: "Bank chiqim",
  TRANSFER: "Ko'chirish",
};

export const paymentSourceLabel: Record<PaymentSource, string> = {
  ORDER: "Buyurtma",
  EXPENSE: "Xarajat",
  PAYROLL: "Oylik",
  SUPPLIER_DEBT_PAYMENT: "Ta'minotchi qarzi",
  SHIPMENT: "Konteyner",
  BATCH_RECEIVE: "Partiya qabuli",
  PAYMENT_SCHEDULE: "Bo'lib to'lash",
  LOAN: "Kredit",
  FOUNDER_TX: "Ta'sischi",
  MANUAL: "Qo'lda",
};

export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  IN_TRANSIT: "Yo'lda",
  ARRIVED: "Yetib keldi",
  COMPLETED: "Yakunlandi",
  CANCELLED: "Bekor qilindi",
};

export const rollStatusLabel: Record<RollStatus, string> = {
  AVAILABLE: "Mavjud",
  RESERVED: "Bandlangan",
  IN_USE: "Ishlatilmoqda",
  DEPLETED: "Tugagan",
};

export const unitTypeLabel: Record<UnitType, string> = {
  DONA: "dona",
  METR: "metr",
  M2: "m²",
  MM: "mm",
  KG: "kg",
  LITR: "litr",
};

export const movementTypeLabel: Record<MovementType, string> = {
  IN: "Kirim",
  OUT: "Chiqim",
  ADJUST: "Sozlash",
  WASTE: "Chiqindi",
};

export const counterpartyTypeLabel: Record<CounterpartyType, string> = {
  CLIENT: "Mijoz",
  SUPPLIER: "Ta'minotchi",
  EMPLOYEE: "Xodim",
  FOUNDER: "Ta'sischi",
  LENDER: "Kreditor",
  OTHER: "Boshqa",
};

export const accountTypeLabel: Record<AccountType, string> = {
  CASH: "Kassa",
  BANK: "Bank",
};

export const currencyLabel: Record<Currency, string> = {
  UZS: "so'm",
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

export const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Bosh administrator",
  ADMIN: "Administrator",
  MANAGER: "Menejer",
  SELLER: "Sotuvchi",
  WAREHOUSE: "Omborchi",
  ACCOUNTANT: "Buxgalter",
  USER: "Foydalanuvchi",
};

export const notifTypeLabel: Record<NotificationType, string> = {
  INFO: "Xabar",
  SUCCESS: "Muvaffaqiyat",
  WARNING: "Ogohlantirish",
  DANGER: "Xato",
};

export const customerKindLabel: Record<CustomerKind, string> = {
  RESELLER: "Qayta sotuvchi",
  RETAIL: "Chakana",
};

export const crmFunnelLabel: Record<CrmFunnel, string> = {
  LEAD: "Lead",
  BUYER: "Xaridor",
};

export const scheduleItemStatusLabel: Record<PaymentScheduleItemStatus, string> = {
  PENDING: "Kutilmoqda",
  PARTIAL: "Qisman",
  PAID: "To'landi",
  OVERDUE: "Muddati o'tdi",
};
