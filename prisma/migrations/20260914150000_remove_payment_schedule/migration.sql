-- Bo'lib to'lash kalendari (PaymentSchedule/PaymentScheduleItem) hech
-- qachon haqiqiy buyurtma oqimida ishlatilmagan — faqat demo/seed
-- ma'lumoti sifatida yaratilgan, meetingda ham kelishilmagan. Sahifasi
-- olib tashlandi, endi bazadagi jadvallari ham tozalanadi.

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_scheduleItemId_fkey";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "scheduleItemId";

ALTER TABLE "PaymentScheduleItem" DROP CONSTRAINT IF EXISTS "PaymentScheduleItem_scheduleId_fkey";
ALTER TABLE "PaymentSchedule" DROP CONSTRAINT IF EXISTS "PaymentSchedule_orderId_fkey";

DROP TABLE IF EXISTS "PaymentScheduleItem";
DROP TABLE IF EXISTS "PaymentSchedule";

DROP TYPE IF EXISTS "PaymentScheduleItemStatus";
