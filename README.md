# OneShop ERP

**iSell + Beltech** — ikki loyihaning birlashtirilgan yagona ERP tizimi. Savdo, ombor, ishlab chiqarish, moliya, CRM va HR — hammasi bitta platformada.

## 🎯 Bir gapda

Yagona baza, yagona login, yagona interfeys — chakana sotuv, ulgurji, ishlab chiqarish (kesim), kassa (POS), CRM voronka, ombor (partiya + rulon), moliya (ko'p valyutali) va xodimlar boshqaruvi.

## 🚀 Tez ishga tushirish

```bash
# 1. Baza va sozlamalar
cp .env.example .env
# .env faylida DATABASE_URL va JWT_SECRET ni yozib chiqing

# 2. Kutubxonalar
npm install

# 3. Baza migratsiyasi
npx prisma migrate dev --name init

# 4. Demo ma'lumot (admin foydalanuvchi + katalog + demo buyurtmalar)
npm run db:seed

# 5. Ishga tushirish
npm run dev
```

Brauzerda oching: **http://localhost:3000**
Kirish: **admin / admin123**

## 🐳 Docker orqali (baza bilan birga)

```bash
docker compose up --build
```

Postgres avtomatik ishga tushadi va app unga ulanadi.

## 🚂 Railway'ga deploy

1. Railway'da yangi proyekt yarating
2. **PostgreSQL plugin** qo'shing
3. GitHub repo ulang
4. Environment variables:
   - `DATABASE_URL` — Postgres pluginidan avtomatik
   - `JWT_SECRET` — uzun tasodifiy satr
5. Deploy — `railway.toml` avtomatik migratsiyani chaqiradi

## 📋 Modullar

| Modul | Yo'l | Nima qiladi |
|---|---|---|
| **Bosh sahifa** | `/` | KPI: oylik savdo, aktiv buyurtma, qarz, kam qoldiq, TOP mijoz |
| **Buyurtmalar** | `/buyurtmalar` | Chakana / ulgurji / ishlab chiqarish buyurtmalar, 7 bosqichli holat |
| **Kassa (POS)** | `/pos` | Do'kondan naqd sotuv, avtomatik kassaga tushiradi |
| **Ombor** | `/omborxona` | Katalog, partiyalar, rulonlar, kam qoldiq ogohlantirishlari |
| **Katalog** | `/katalog` | Asosiy SKU va kategoriyalar (daraxt) |
| **Konteynerlar** | `/xaridlar` | Ta'minotchidan mahsulot qabuli + xarajatlar |
| **Mijozlar** | `/mijozlar` | Faqat mijozlar ro'yxati |
| **CRM** | `/crm` | Lead voronka — Kanban ko'rinishida |
| **Kontragentlar** | `/kontragentlar` | Universal: mijoz/ta'minotchi/xodim/ta'sischi/kreditor |
| **Xodimlar** | `/xodimlar` | Xodimlar + davomad + oyliklar |
| **Moliya** | `/moliya` | Umumiy, tranzaksiyalar, hisoblar, qarzdorliklar, kalendar |
| **Hisobotlar** | `/hisobotlar` | Oylik daromad/xarajat/foyda, TOP sotuvchi, TOP mahsulot |
| **Bildirishnomalar** | `/xabarnomalar` | Kam qoldiq, muddati o'tgan to'lov, VIP buyurtma |
| **Sozlamalar** | `/sozlamalar` | Foydalanuvchilar, rollar, hisoblar, kategoriyalar |

## 🧱 Arxitektura

- **Frontend**: Next.js 16 App Router + React 19 + Tailwind CSS 4
- **Backend**: Next.js Route Handlers (`/api/...`)
- **DB**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT (jose) + bcrypt + HttpOnly cookie
- **RBAC**: Dinamik rollar (`custom_roles.permissions JSON`)
- **Til**: O'zbekcha UI (butun tizim)
- **Valyuta**: UZS asosiy, USD/EUR/RUB qo'llab-quvvatlanadi, har buyurtmada kurs saqlab olinadi

## 🔐 Rollar va ruxsatlar

Tayyor rollar:
- `SUPER_ADMIN` — barcha ruxsatlar
- `ADMIN` — barcha modullar (`orders.*`, `warehouse.*`, ...)
- `MANAGER` — buyurtma + mijoz + CRM + hisobot
- `SELLER` — buyurtma + mijoz + CRM
- `WAREHOUSE` — faqat ombor + buyurtmani ko'rish
- `ACCOUNTANT` — moliya + hisobot
- Yangi rol yaratsangiz — `custom_roles.permissions` JSON'ga string massivi qo'shing:
  `["orders.write", "warehouse.read", "finance.*"]`

## 🔄 Buyurtma holat mashinasi

**Chakana / Ulgurji** (7 bosqich):
`YANGI_SOROV → MASLAHAT_BERILDI → NARX_KELISHILDI → BUYURTMA_OLINDI → YETKAZILMOQDA → YAKUNLANDI`

**Ishlab chiqarish** (kesim):
`PROPOSAL → NEW → PROCESSING → READY → DELIVERED`

**POS**: `YANGI_SOROV → YAKUNLANDI` (avtomatik)

Barcha turlar `CANCELLED` bilan tugashi mumkin.

Ombor kamaytirilishi: buyurtma "taklif" bosqichidan chiqqanda; qaytarilishi: qaytib "taklif"ga o'tganda.

## 🌐 Ma'lumotlar bazasi asosiy jadvallari (~30)

- Identity: `User`, `CustomRole`, `Session`
- Kontragentlar: `Counterparty`, `ClientProfile`, `SupplierProfile`, `Employee`, `FounderProfile`
- Katalog: `ProductCategory`, `CatalogProduct`, `ProductPriceHistory`, `AdditionalProduct`
- Ombor: `Warehouse`, `Branch`, `InventoryLot`, `InventoryRoll`, `Remnant`, `StockMovement`
- Konteyner: `Shipment`, `ShipmentItem`, `ShipmentExpense`
- Buyurtma: `Order`, `OrderItem`, `OrderAdditionalItem`, `OrderStatusHistory`
- Moliya: `Account`, `Payment`, `TransactionCategory`, `PaymentSchedule`, `PaymentScheduleItem`
- HR: `Attendance`, `AttendancePause`, `PayrollAccrual`
- Kredit / Ta'sischi: `Loan`, `LoanPayment`, `FounderTransaction`
- CRM: `CrmStageConfig`, `CrmStageReason`, `CrmStageHistory`, `CallLog`
- Xizmat: `Notification`, `Setting`, `UserDashboardSetting`, `FxRate`, `Log`

Batafsil: `prisma/schema.prisma`.

## 🧪 Demo ma'lumot

`npm run db:seed` chaqiruvi quyidagilarni yaratadi:
- 2 foydalanuvchi (admin, kassir)
- 1 asosiy ombor
- 5 kategoriya, 7 katalog mahsuloti + partiyalar
- 3 hisob (kassa, bank, USD naqd)
- Walk-in mijoz + 5 haqiqiy mijoz
- 1 ta'minotchi + 1 xodim
- 6 CRM bosqich (Lead voronka)
- 8 demo buyurtma turli holatlarda

## 📚 Batafsil hujjat

Butun arxitekturaviy asos, birlashtirish mantiq va logika QA hisoboti:
`UNIFIED_ERP_ARCHITECTURE.md` (avvalgi tahlildan).

## 🛠 Dev buyruqlari

```bash
npm run dev              # Development server (Turbopack)
npm run build            # Production build
npm run start            # Production start
npm run prisma:studio    # Prisma Studio (web UI baza uchun)
npm run prisma:migrate   # Yangi migratsiya
npm run prisma:deploy    # Production migratsiya
npm run db:seed          # Demo ma'lumot
npm run lint             # ESLint
```

## 🔧 Foydali eslatmalar

- Barcha yo'llar `/api` dan boshlanadi — Next.js Route Handlers
- Ombordagi barcha o'zgarishlar `StockMovement` jadvaliga yoziladi (audit)
- Har bir buyurtma holati o'zgartirilganda `OrderStatusHistory` ga yozuv qo'shiladi
- Pul harakati `Payment` orqali yagona ledger'ga tushadi (`sourceType` bilan aniqlash mumkin: `ORDER`, `PAYROLL`, `SHIPMENT`, va h.k.)
- Chegirmalarni ochish/yopish uchun `middleware.ts` da `PUBLIC` massivini o'zgartiring

---

Muallif: `data365` · Fon: **iSell (@data365-git/iselll)** + **Beltech (@data365-git/belt-tech2)** loyihalarining birlashtirilgan arxitekturasi
