# Texnik Topshiriq (TZ)

## OneShop ERP — Polizol Ishlab Chiqarish Korxonasi uchun

**Sana**: 2026-09-09
**Loyiha**: OneShop ERP
**Buyurtmachi**: Polizol ishlab chiqaruvchi korxona
**Ishlab chiquvchi**: data365
**Versiya**: 1.0

---

## 1. Loyiha haqida umumiy ma'lumot

### 1.1. Loyiha maqsadi
Polizol (tomga yopishtiriladigan izolyator) ishlab chiqaruvchi korxonaning barcha jarayonlarini bitta yagona tizimda birlashtirish: xomashyo qabuli, ishlab chiqarish, ombor, sotuv, moliya, mijoz va ta'minotchi bilan ishlash.

### 1.2. Loyiha maqsadi (bir gapda)
Ruchka, qog'oz va Excelni tark etib, biznesning har bir jarayonini avtomatik boshqaradigan va real vaqtda hisobot beradigan tizimga o'tish.

### 1.3. Foydalanuvchilar
- **Rahbar (egasi)** — barcha ma'lumotlarni ko'radi, qarorlar qabul qiladi
- **Sotuvchi / Menejer** — mijoz, buyurtma, CRM bilan ishlaydi
- **Sex mudiri (Alisher)** — ishlab chiqarish, xomashyo qabuli
- **Omborchi** — ombor kirim-chiqim
- **Buxgalter** — moliya, hisobotlar
- **Ta'minotchi** (tashqi) — Telegram bot orqali
- **Mijoz** (tashqi) — Telegram bot orqali
- **Haydovchi** (tashqi) — Telegram bot orqali

---

## 2. Biznes tavsifi

### 2.1. Mahsulot
- **Asosiy mahsulot**: Polizol (rulon shaklida izolyator)
- **Qo'shimcha**: Chelakli mastika
- **Turlari**: 10 kg – 40 kg oralig'ida, folgali/folgasiz, zarli/zarsiz
- **Jami**: ~20-25 xil variant
- **Asosiy sotiladigan**: 33 kg li ("uchlik")

### 2.2. Xomashyo
| Nomi | Manba | Valyuta |
|---|---|---|
| Bitum | Turkmaniston, Buxoro | USD |
| Steklaxolst | O'zbekiston / Xitoy | UZS |
| Alyuminiy folga | Xitoy | USD |
| Mel (bo'r) | Mahalliy | UZS |
| Qayta ishlangan bitum | Mahalliy | UZS |

### 2.3. Mijozlar
- **B2B (90%)** — quruvchilar, katta zakazlar, 90% o'tkazma bilan
- **B2C (10%)** — bozor, kichik zakazlar, naqd pul

### 2.4. Ishlab chiqarish jarayoni
- **2 ta qozon** navbatma-navbat ishlaydi
- **Bir qozon** — 7-10 soat pishirish
- **Liniyadan chiqarish** — 3-4 soat
- **Xodimlar**: 5-6 kishi (3-4 liniyada, 2 yuk ortishda)
- **Ish haqi**: сдельный (donaga qarab) — 3000 so'm/dona
- **Kunlik hajm**: ~12 tonna ≈ 360-375 rulon

### 2.5. Yetkazish
- **Toshkent ichi**: o'z haydovchi, 800,000 so'm atrofida
- **Viloyat**: mijoz o'zi olib ketadi
- **Mashina sig'imi**: 300-320 rulon
- **Minimal yetkazish**: 10 tonnadan (poddon xarajati sababli)

---

## 3. Hozirgi muammolar (nima uchun tizim kerak)

1. **Qarzdorlar noaniq** — kim qancha qarzdor, esdan chiqadi
2. **Ombor noaniq** — mahsulot bor-yo'qligi telefon qilib so'raladi
3. **Sverka janjali** — ta'minotchi bilan qog'oz-Excelda taqqoslash
4. **Xodim nazorati yo'q** — kimda qancha xatolik ekanligi bilinmaydi
5. **Foyda-zarar noaniq** — kunlik/oylik foyda faqat miyada
6. **Mijoz marjasi noaniq** — kim doim skidka so'raydi, kim foyda keltiradi
7. **Xatolik topilmaydi** — 12 tonna kelib 11 tonna yozilsa — bilinmaydi
8. **Xarajat trekingi yo'q** — daftarlarga yoziladi, Alisher akadan pul so'raladi
9. **Kalkulyatsiya xato** — mahsulot tannarxi taxminan hisoblanadi

---

## 4. Yechim — nima quriladi

### 4.1. Tizim arxitekturasi
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS
- **Backend**: Next.js Route Handlers + Prisma ORM
- **DB**: PostgreSQL 16
- **Auth**: JWT + bcrypt
- **Bot**: Telegram Bot API (webhook)
- **AI (2-etap)**: OpenAI Vision (rasm), Whisper (ovoz)
- **Deploy**: Railway
- **Til**: O'zbek tili
- **Valyuta**: UZS asosiy, USD/EUR/RUB qo'shimcha

### 4.2. Xavfsizlik
- Har foydalanuvchida o'z login/paroli
- Rol-asosli ruxsat (RBAC)
- Ma'lumotlar faqat mijozning serverida (Railway)
- Dasturchida ham baza kalitiga ruxsat yo'q
- Davlat tashkilotlariga ulanmagan — ichki qora kassa

---

## 5. Modullar ro'yxati

### 5.1. Allaqachon tayyor modullar ✅

| # | Modul | Yo'l | Vazifa |
|---|---|---|---|
| 1 | Bosh sahifa | `/` | KPI: sotuv, qarz, kam qoldiq |
| 2 | Buyurtmalar | `/buyurtmalar` | 7 bosqichli buyurtma boshqaruvi |
| 3 | Kassa (POS) | `/pos` | Do'kondan naqd sotuv |
| 4 | Ombor | `/omborxona` | Katalog, partiya, rulon |
| 5 | Katalog | `/katalog` | Mahsulot bazasi |
| 6 | Konteynerlar | `/xaridlar` | Ta'minotchidan qabul + xarajat |
| 7 | Mijozlar | `/mijozlar` | Mijoz ro'yxati |
| 8 | CRM | `/crm` | Lead voronka (Kanban) |
| 9 | Kontragentlar | `/kontragentlar` | Umumiy: mijoz/ta'minotchi/xodim |
| 10 | Xodimlar | `/xodimlar` | Xodim + davomat + oylik |
| 11 | Moliya | `/moliya` | Ko'p valyuta, hisoblar, qarzdorlik |
| 12 | Hisobotlar | `/hisobotlar` | Daromad, xarajat, foyda |
| 13 | Bildirishnomalar | `/xabarnomalar` | Ogohlantirishlar |
| 14 | Sozlamalar | `/sozlamalar` | Foydalanuvchi, rol, hisob |

### 5.2. YANGI qo'shiladigan modullar (1-etap) 🔴

| # | Modul | Vazifa | Muhimlik |
|---|---|---|---|
| 15 | **Telegram Bot** | Ta'minotchi/mijoz/haydovchi bilan aloqa | ⭐⭐⭐ |
| 16 | **Retsept (BOM)** | Zapravka — qaysi mahsulotga qancha xomashyo | ⭐⭐⭐ |
| 17 | **Yetkazish (Logistika)** | Haydovchi, mashina, to'lov, nakladnoy PDF | ⭐⭐⭐ |
| 18 | **Kredit limit** | Har mijoz uchun cheklov + tekshirish | ⭐⭐ |
| 19 | **Mijoz marja hisoboti** | Yillik sof foyda, skidka, dostavka yig'ilma | ⭐⭐ |

### 5.3. YANGI qo'shiladigan modullar (2-etap) 🟡

| # | Modul | Vazifa |
|---|---|---|
| 20 | **Nakladnoy OCR** | Rasm orqali xomashyo kirimini avtomatik yozish |
| 21 | **Ovozli xabar** | Telegramdan ovoz → tranzaksiya |
| 22 | **Kazan rejasi** | Ishlab chiqarish planlash boardi |
| 23 | **Filial P&L** | Har bozor tochkasi bo'yicha daromad-xarajat |
| 24 | **Ichki transfer** | Bir filialdan boshqasiga zayavka |
| 25 | **KPI + bonus** | Xodim bonuslarini avtomatik hisoblash |

### 5.4. YANGI qo'shiladigan modullar (3-etap) 🟢

| # | Modul | Vazifa |
|---|---|---|
| 26 | **Buxgalteriya integratsiyasi** | Shot-faktura yopish avtomatlashuvi |
| 27 | **Kamera + AI** | Xodim nazorati, "tualet reyting" |
| 28 | **SMS jo'natish** | Mijozga SMS bildirishnoma |

---

## 6. Batafsil talablar — 1-ETAP modullar

### 6.1. Telegram Bot

#### 6.1.1. Umumiy talablar
- BotFather orqali yaratiladi
- Webhook `/api/telegram/webhook` orqali ishlaydi
- Har foydalanuvchi telefon raqami orqali autentifikatsiya qilinadi
- Bot 4 xil rolda ishlaydi: `SUPPLIER`, `CLIENT`, `DRIVER`, `EMPLOYEE`

#### 6.1.2. Ta'minotchi boti
**Funksiyalari**:
- `/start` — tanishuv + telefon so'rash
- Bazadan topib link yaratish
- Har xomashyo qabulida avtomatik xabar
- Har to'lovda avtomatik xabar
- Joriy qarz miqdorini ko'rsatish
- "Pul so'rash" tugmasi → rahbariyatga xabar

**Xabar shabloni**:
```
Salom [ism]!
Bugun sizga [X] tonna [mahsulot] qabul qilindi.
To'lov: [Y] USD
Qarz: [Z] USD
```

#### 6.1.3. Mijoz boti
**Funksiyalari**:
- Telefon → bazadan topish
- Barcha buyurtmalar tarixi
- Joriy qarz + muddati
- Buyurtma statusi (ishlab chiqarilyapti, tayyor, yo'lda, yetkazildi)
- "Yangi buyurtma" tugmasi

#### 6.1.4. Haydovchi boti
**Funksiyalari**:
- Bugungi yetkazish ro'yxati
- Har buyurtma uchun "Yetkazdim" tugmasi
- Tugma bosilsa → mijozga schyot, ERPda status yangilanadi
- Yo'l kira miqdori ko'rinadi

#### 6.1.5. Avtomatik xabarlar (cron)
| Vaqt | Kimga | Nima |
|---|---|---|
| Har juma 10:00 | Qarzdor mijoz | Qarz eslatmasi |
| Kam qoldiq | Rahbar + Alisher | Ogohlantirish |
| Buyurtma YETKAZILMOQDA | Mijoz | Mashina raqami |
| VIP buyurtma | Rahbar | Real-time |
| 30 kundan oshgan qarz | Ta'minotchi + rahbar | Eslatma |

### 6.2. Retsept (BOM)

#### 6.2.1. Ma'lumot modeli
```
Recipe:
  - id
  - catalogProductId  (qaysi mahsulotga)
  - variantName       (masalan: "Standart", "Shirali", "Arzon")
  - createdAt

RecipeIngredient:
  - recipeId
  - materialProductId  (bitum, mel, folga...)
  - quantity
  - unitType (kg, m², dona)
```

#### 6.2.2. Ishlash mantiqi
- Har polizol turiga (33 kg uchlik, 22 kg, folgali...) alohida retsept
- Buyurtma `PROCESSING` bosqichiga o'tsa — retseptga qarab xomashyo rezerv
- Buyurtma `READY` bo'lsa — xomashyo `StockMovement` orqali minus
- Yetmasa — ogohlantirish

### 6.3. Yetkazish (Logistika)

#### 6.3.1. Order jadvaliga qo'shiladigan maydonlar
```
- driverName          (haydovchi ismi)
- driverPhone         (telefon)
- driverCarNumber     (mashina raqami)
- deliveryCost        (yo'l kira)
- deliveryPaidToId    (kimga to'landi)
- deliveryPaidAt      (qachon)
- deliveredAt         (qachon yetkazildi)
- receiverName        (qabul qiluvchi)
- receiverPhone
- receiverSignature   (rasm/imzo)
```

#### 6.3.2. Nakladnoy PDF
Avtomatik generatsiya, ichida:
- Firma nomi, logo, imzo
- Buyurtma raqami, sana
- Mijoz nomi, manzil
- Mahsulot ro'yxati (soni, o'lchov)
- Mashina raqami, haydovchi
- Qabul qiluvchi joyi (imzo uchun)

### 6.4. Kredit limit

#### 6.4.1. ClientProfile ga qo'shiladigan maydonlar
```
- creditLimit          (masalan 100,000,000)
- creditLimitCurrency  (UZS / USD)
- creditLimitEnabled   (true/false)
```

#### 6.4.2. Tekshirish
- Buyurtma yaratayotganda: joriy qarz + yangi buyurtma > limit → bloklash yoki tasdiqlash so'rash
- Faqat `MANAGER` va yuqori rollar bekor qila oladi

### 6.5. Mijoz marja hisoboti

#### 6.5.1. Hisobot mazmuni
Har mijoz uchun tanlangan davr (oy/chorak/yil):
- Jami sotuv summasi
- Tannarx (retseptdan hisoblanadi)
- Skidka summasi
- Yetkazish xarajati
- Sof foyda
- Foyda foizi

#### 6.5.2. Ko'rinishi
- Jadval + grafik
- Sortirovka: eng foydali → eng zararli mijoz
- Excel eksporti
