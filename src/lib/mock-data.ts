export interface ProductItem {
  id: string;
  artikul: string;
  name: string;
  color: string;
  imageUrl: string;
  unit: string;
  storeQty: number;
  remaining: number | null;
}

export interface MaterialItem {
  id: string;
  artikul: string;
  name: string;
  category: string;
  tag?: string;
  warehouse: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  properties?: Record<string, string>;
  imageUrl?: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "NEW" | "IN_PROGRESS" | "SEMI_FINISHED" | "COMPLETED";
  createdAt: string;
  dueDate: string | null;
  completedQty: number;
}

export interface BomModel {
  id: string;
  artikul: string;
  name: string;
  imageUrl: string;
  canProduce: number;
  items: { materialName: string; quantity: number; unit: string }[];
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  screen: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT";
  description: string;
  createdAt: string;
}

export const products: ProductItem[] = [
  { id: "1", artikul: "BOM-15", name: "Melek brown", color: "brown", imageUrl: "/images/product1.jpg", unit: "DONA", storeQty: 0, remaining: null },
  { id: "2", artikul: "BOM-45", name: "Fatima green", color: "green", imageUrl: "/images/product2.jpg", unit: "DONA", storeQty: 0, remaining: null },
  { id: "3", artikul: "BOM-04", name: "Rumiya orange", color: "orange", imageUrl: "/images/product3.jpg", unit: "DONA", storeQty: 0, remaining: null },
  { id: "4", artikul: "BOM-22", name: "Melek blue", color: "blue", imageUrl: "/images/product4.jpg", unit: "DONA", storeQty: 5, remaining: null },
  { id: "5", artikul: "BOM-33", name: "Safiya black", color: "black", imageUrl: "/images/product5.jpg", unit: "DONA", storeQty: 12, remaining: null },
  { id: "6", artikul: "BOM-09", name: "Ayna bantik", color: "red", imageUrl: "/images/product6.jpg", unit: "DONA", storeQty: 3, remaining: null },
  { id: "7", artikul: "BOM-51", name: "Fadiya black", color: "black", imageUrl: "/images/product7.jpg", unit: "DONA", storeQty: 0, remaining: null },
  { id: "8", artikul: "BOM-17", name: "Anisa rose", color: "red", imageUrl: "/images/product8.jpg", unit: "DONA", storeQty: 8, remaining: null },
  { id: "9", artikul: "BOM-62", name: "Xadidja black", color: "black", imageUrl: "/images/product9.jpg", unit: "DONA", storeQty: 2, remaining: null },
  { id: "10", artikul: "BOM-88", name: "Nur red", color: "red", imageUrl: "/images/product10.jpg", unit: "DONA", storeQty: 15, remaining: null },
];

export const materialCategories = [
  "Все", "Ткань", "Нить", "Фурнитура", "Аксессуар", "Пуговицы", "Кружева", "Паспорта"
];

export const materials: MaterialItem[] = [
  { id: "1", artikul: "mat-017", name: "Материал 17", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 224, minQuantity: 20, properties: { density: "180 Г/М²" } },
  { id: "2", artikul: "mat-019", name: "Материал 19", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 31, minQuantity: 20, properties: { density: "220 Г/М²" } },
  { id: "3", artikul: "mat-020", name: "Материал 20", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 101, minQuantity: 20, properties: { density: "150 Г/М²" } },
  { id: "4", artikul: "mat-021", name: "Материал 21", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 52, minQuantity: 20, properties: { density: "190 Г/М²" } },
  { id: "5", artikul: "mat-022", name: "Материал 22", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 84, minQuantity: 20, properties: { density: "200 Г/М²" } },
  { id: "6", artikul: "mat-023", name: "Материал 23", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 41, minQuantity: 20, properties: { density: "170 Г/М²" } },
  { id: "7", artikul: "mat-049", name: "Материал 49", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 7, minQuantity: 10, properties: { density: "205 Г/М²" }, imageUrl: "/images/mat1.jpg" },
  { id: "8", artikul: "mat-074", name: "Материал 74", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 5, minQuantity: 10, properties: { density: "347 Г/М²" }, imageUrl: "/images/mat2.jpg" },
  { id: "9", artikul: "mat-142", name: "Материал 142", category: "Mato", warehouse: "Цех ACHAM", unit: "metr", quantity: 4, minQuantity: 10, properties: { density: "125 Г/М²" }, imageUrl: "/images/mat3.jpg" },
  { id: "10", artikul: "mat-055", name: "Нить белая", category: "Нить", warehouse: "Цех ACHAM", unit: "dona", quantity: 50, minQuantity: 10 },
  { id: "11", artikul: "mat-056", name: "Нить чёрная", category: "Нить", warehouse: "Цех ACHAM", unit: "dona", quantity: 45, minQuantity: 10 },
  { id: "12", artikul: "mat-100", name: "Пуговица перламутр", category: "Пуговицы", warehouse: "Цех ACHAM", unit: "dona", quantity: 200, minQuantity: 50 },
  { id: "13", artikul: "mat-101", name: "Кружево 5см белое", category: "Кружева", warehouse: "Цех ACHAM", unit: "metr", quantity: 30, minQuantity: 10 },
  { id: "14", artikul: "mat-110", name: "Паспорт AYNA BANTIK", category: "Паспорта", warehouse: "Цех ACHAM", unit: "dona", quantity: 100, minQuantity: 20 },
  { id: "15", artikul: "mat-111", name: "Паспорт MELEK BROWN", category: "Паспорта", warehouse: "Цех ACHAM", unit: "dona", quantity: 80, minQuantity: 20 },
];

export const orders: OrderItem[] = [
  {
    id: "1",
    orderNumber: "PO-95993",
    productName: "Nur red",
    quantity: 15,
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    createdAt: "2026-07-18",
    dueDate: null,
    completedQty: 15,
  },
];

export const bomModels: BomModel[] = [
  {
    id: "1", artikul: "1/23-26-CT-DR-19-L-BL/R-81773", name: "Nur red", imageUrl: "/images/product10.jpg", canProduce: 27,
    items: [
      { materialName: "Материал 58", quantity: 3.65, unit: "metr" },
      { materialName: "Материал 122", quantity: 2.4, unit: "metr" },
      { materialName: "Brand 1", quantity: 1, unit: "dona" },
    ],
  },
  {
    id: "2", artikul: "1/23-26-HP/CT/LN-DR-15-L-BL/WHT-85543", name: "RANO", imageUrl: "/images/product2.jpg", canProduce: 0,
    items: [
      { materialName: "Материал 165", quantity: 4, unit: "metr" },
      { materialName: "Материал 149", quantity: 0.36, unit: "metr" },
      { materialName: "Brand 1", quantity: 1, unit: "dona" },
    ],
  },
  {
    id: "3", artikul: "DR-95174", name: "AYNA gorox", imageUrl: "/images/product6.jpg", canProduce: 15,
    items: [
      { materialName: "Материал 57", quantity: 2.55, unit: "metr" },
      { materialName: "Материал 145", quantity: 2.35, unit: "metr" },
      { materialName: "Brand Tugma", quantity: 3, unit: "dona" },
    ],
  },
  {
    id: "4", artikul: "DR-67396", name: "Rumiya flower", imageUrl: "/images/product3.jpg", canProduce: 0,
    items: [
      { materialName: "Материал 42", quantity: 0.5, unit: "metr" },
      { materialName: "Материал 159", quantity: 3.3, unit: "metr" },
      { materialName: "Материал 1", quantity: 1.3, unit: "metr" },
    ],
  },
  {
    id: "5", artikul: "DR-15623", name: "Melek blue", imageUrl: "/images/product4.jpg", canProduce: 0,
    items: [
      { materialName: "Материал 155", quantity: 8, unit: "metr" },
      { materialName: "Brand 1", quantity: 1, unit: "dona" },
      { materialName: "Brand 2", quantity: 1, unit: "dona" },
    ],
  },
  {
    id: "6", artikul: "DR-64057", name: "Albuhu rose", imageUrl: "/images/product8.jpg", canProduce: 0,
    items: [
      { materialName: "Материал 82", quantity: 4.5, unit: "metr" },
      { materialName: "Пуговица 10", quantity: 8, unit: "dona" },
      { materialName: "Brand 5", quantity: 2, unit: "dona" },
    ],
  },
];

export const logs: LogEntry[] = [
  { id: "1", userId: "1", userName: "kamron_asoschi", screen: "Сырьё", action: "UPDATE", description: "Материал 209 — остаток измен...", createdAt: "2026-08-29T15:20:00" },
  { id: "2", userId: "1", userName: "kamron_asoschi", screen: "xomashyolar", action: "UPDATE", description: "Tuzatish: 96.33 → 92. -", createdAt: "2026-08-29T15:20:00" },
  { id: "3", userId: "1", userName: "kamron_asoschi", screen: "xomashyolar", action: "UPDATE", description: "Material tahrirlandi: 209", createdAt: "2026-08-29T15:20:00" },
  { id: "4", userId: "1", userName: "kamron_asoschi", screen: "xomashyolar", action: "UPDATE", description: "Material tahrirlandi: 209", createdAt: "2026-08-29T15:20:00" },
  { id: "5", userId: "1", userName: "kamron_asoschi", screen: "Сырьё", action: "UPDATE", description: "Материал 198 — остаток измен...", createdAt: "2026-08-29T15:19:00" },
];

export const warehouses = ["Все", "Цех ACHAM", "Store ACHAM", "Store POS"];

export const productColors = [
  { label: "Все", value: "all" },
  { label: "black", value: "black" },
  { label: "red", value: "red" },
  { label: "brown", value: "brown" },
  { label: "blue", value: "blue" },
  { label: "green", value: "green" },
  { label: "orange", value: "orange" },
];

export const passportProducts = [
  "AYNA BANTIK", "MELEK BROWN", "FATIMA GREEN", "SAFIYA",
  "FADIYA BLACK", "RUMIYA ORANGE", "MELEK GREY", "ANISA ROSE",
  "XADIDJA BLACK", "ASVAD XL BROWN", "ASVAD XL BLACK", "ZUXEYR",
];
