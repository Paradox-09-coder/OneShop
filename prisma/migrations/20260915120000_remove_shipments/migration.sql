-- "Konteynerlar" (Shipment/procurement tracking) hech qachon meetingda
-- gaplashilmagan va faqat ko'rish uchun (qo'shish/tahrirlash yo'q,
-- omborga bog'lanmagan) edi — sahifasi olib tashlandi, endi bazadagi
-- jadvallari ham tozalanadi.

ALTER TABLE "InventoryRoll" DROP CONSTRAINT IF EXISTS "InventoryRoll_shipmentItemId_fkey";
ALTER TABLE "InventoryRoll" DROP COLUMN IF EXISTS "shipmentItemId";

ALTER TABLE "ShipmentItem" DROP CONSTRAINT IF EXISTS "ShipmentItem_shipmentId_fkey";
ALTER TABLE "ShipmentItem" DROP CONSTRAINT IF EXISTS "ShipmentItem_catalogProductId_fkey";
ALTER TABLE "ShipmentExpense" DROP CONSTRAINT IF EXISTS "ShipmentExpense_shipmentId_fkey";
ALTER TABLE "Shipment" DROP CONSTRAINT IF EXISTS "Shipment_supplierId_fkey";

DROP TABLE IF EXISTS "ShipmentExpense";
DROP TABLE IF EXISTS "ShipmentItem";
DROP TABLE IF EXISTS "Shipment";

DROP TYPE IF EXISTS "ShipmentStatus";
