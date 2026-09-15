-- Bitta oyda bir necha marta to'lash imkonini berish uchun (avans +
-- qolgan qism) — employeeId+period bo'yicha unique cheklov olib
-- tashlanadi, o'rniga oddiy index qo'yiladi.
DROP INDEX IF EXISTS "PayrollAccrual_employeeId_period_key";
CREATE INDEX IF NOT EXISTS "PayrollAccrual_employeeId_period_idx" ON "PayrollAccrual"("employeeId", "period");
