# Texnik Topshiriq — Telegram Bot (@oneshop_erp_bot)

**Sana**: 2026-09-10
**Loyiha**: OneShop ERP — Polizol ishlab chiqarish
**Asos**: Meeting transkripti + TZ.md + hozirgi kod holati (`src/app/api/telegram/webhook/route.ts`)

---

## 1. Umumiy tuzilma

Bot **4 xil "tashqi" foydalanuvchi** bilan ishlaydi. Ular web tizimga kira olmaydi — faqat Telegram orqali.

| Rol | Bazadagi turi | Qanday aniqlanadi |
|---|---|---|
| Mijoz | `Counterparty.type = CLIENT` | Telefon raqami orqali |
| Ta'minotchi | `Counterparty.type = SUPPLIER` | Telefon raqami orqali |
| Haydovchi | `Counterparty.type = OTHER` | Telefon raqami orqali |
| Rahbar/Xodim | — | **Bot orqali emas**, web orqali (login/parol) |

**Tanishuv jarayoni** (hammasi uchun bir xil):
1. `/start` → bot salomlashadi, telefon so'raydi
2. Mijoz **"📱 Telefon raqamimni yuborish"** tugmasini bosadi
3. Bot bazadan shu telefon raqamli kontragentni qidiradi
4. Topilsa — turi (CLIENT/SUPPLIER/OTHER) bo'yicha tegishli menyu chiqadi
5. Topilmasa — *"Bosh ofis bilan bog'laning"* deb yozadi

⚠️ **Cheklov**: bitta telefon raqami — bitta rolga bog'lanadi. Bir kishi ikkita rolda (masalan ham mijoz, ham haydovchi) bo'lolmaydi hozircha.

---

## 2. Mijoz (CLIENT) — nima qilishi kerak

### 2.1. Hozir ishlaydi ✅

| Tugma | Nima qiladi |
|---|---|
| 🛒 Buyurtmalarim | Oxirgi 5 ta buyurtma: raqami, holati, summasi |
| 💳 Qarzim qancha? | Umumiy qarz summasi (barcha yakunlanmagan buyurtmalar bo'yicha) |

### 2.2. Bugbor ❌ — tuzatish kerak

| Tugma | Muammo |
|---|---|
| 📦 Yangi buyurtma | **Ishlamaydi** — matn moslashtirish xatosi tufayli "Buyurtmalarim" bilan adashib, faqat ro'yxatni ko'rsatadi |

### 2.3. Kerak (meeting: 21:16–23:21) 🔧

> *"Telegram botdan belgilab yuborishadi... Og'zaki aytadilar, xohlasalar og'zaki aytadilar, robotni o'zi tekst qilib beradi."*

**Yechim (1-etap, sodda va ishonchli)**:
1. Mijoz **"📦 Yangi buyurtma"** bosadi
2. Bot: *"Nima kerak ekanini yozing (masalan: '3 lik folgadan 100 ta')"*
3. Mijoz erkin matn yozadi
4. Bot buni **`ClientInquiry`** (yangi jadval) sifatida saqlaydi: matn, mijoz, sana
5. **Rahbar/Sotuvchiga bildirishnoma** (`Notification`) + guruhga xabar (agar sozlangan bo'lsa)
6. Sotuvchi buni ko'rib, **haqiqiy buyurtmaga** (`/buyurtmalar/yangi`) aylantiradi

**Ovozli xabar** (matn o'rniga ovoz yuborsa) — Gemini API bilan matnga o'giriladi, xuddi shu jarayon davom etadi. **2-etap** (hozir emas — Ahmad aka: *"golosovoyga ishonmanglar... birinchi etapda"*).

### 2.4. Avtomatik xabarlar (kerak, hali yo'q) 🔧

| Voqea | Xabar |
|---|---|
| Buyurtma "Yetkazilmoqda" bo'lsa | *"Buyurtmangiz yo'lda! Mashina: 01A012QA, haydovchi: Otabek"* |
| Haydovchi "Yetkazdim" bossa | *"Yetkazildi. Oldingizmi? [Ha] [Yo'q]"* tugmasi |
| Mijoz "Ha" bossa | Bot avtomatik **schyot/qarz eslatmasini** yuboradi: *"Sizga N so'm qarzingiz bor"* |
| Har juma 10:00 (agar qarzi bo'lsa) | Qarz eslatmasi (meeting: *"har nechchidir kunda eslatadi"*) |

---

## 3. Ta'minotchi (SUPPLIER) — nima qilishi kerak

### 3.1. Hozir ishlaydi ✅

| Tugma | Nima qiladi |
|---|---|
| 📊 Qarzim qancha? | Balans holati (biz qarzdormiz / ular qarzdor) |
| 📦 Oxirgi qabullar | Oxirgi 5 ta konteyner (Shipment) — nomi, summasi |

### 3.2. Hozir yo'q, lekin tugma bor (ishlamaydi) ❌

| Tugma | Holat |
|---|---|
| 💰 To'lovlar tarixi | Handler yozilmagan — bosilsa hech narsa bo'lmaydi |
| ☎️ Rahbariyat | Handler yozilmagan |

### 3.3. Kerak (meeting: 04:02–05:16) 🔧 — **eng muhim funksiya**

> *"Biz kiritsak, unga xabar boradi, biz sendan mana bunchalik mahsulot oldik va shuncha pul berdik va mana buncha qarz qoldi."*

> *"Senga 2000 to'ladik, qarzing 1000 dollar qoldi, misol uchun. Bo'ldi, toki ertaga sverka qilayotgan paytda ham ikkalamiz aniq narsani ko'rib turamiz."*

**Yechim — AVTOMATIK PUSH xabar** (hozir yo'q, faqat pull/so'rov bor):

1. **Konteyner (Shipment) yaratilganda va `transferredToInventory: true` bo'lganda** →
   ```
   Salom [ism]!
   Bugun sizga [X] tonna [mahsulot] qabul qilindi.
   Konteyner: [raqami]
   Qarz: [joriy balans]
   ```
2. **To'lov qilinganda** (`Payment.sourceType = 'SHIPMENT'` yoki ta'minotchiga bog'liq to'lov) →
   ```
   Sizga [Y] [valyuta] to'ladik.
   Qarzingiz [Z] [valyuta] qoldi.
   ```

**Nega muhim**: bu — Ahmad akaning **eng ustuvor** deb aytgan funksiyasi (sverka/hisob-kitob nizolarini oldini olish uchun).

### 3.4. 30 kundan oshgan qarz eslatmasi (meeting 6.1.5-jadval) 🔧

Cron: har kuni tekshirib, 30 kundan oshgan qarzlar bo'lsa — ta'minotchiga + rahbarga xabar.

---

## 4. Haydovchi (OTHER, nomi "haydovchi" so'zini o'z ichiga oladi) — nima qilishi kerak

### 4.1. Hozir ishlaydi ✅ (qisman)

| Tugma | Nima qiladi | Muammo |
|---|---|---|
| 📋 Bugungi yetkazishlar | `YETKAZILMOQDA` holatidagi va bugungi sanaga rejalashtirilgan buyurtmalarni ko'rsatadi | **Filtrlanmagan** — barcha haydovchilarga BARCHA yetkazishlar ko'rinadi, faqat o'ziga tegishlisi emas |

### 4.2. Hozir yo'q, lekin tugma bor (ishlamaydi) ❌

| Tugma | Holat |
|---|---|
| ✅ Yetkazdim | Handler yozilmagan |
| 💰 Yo'l kira | Handler yozilmagan |

### 4.3. Kerak (meeting: 45:37–47:45) 🔧

> *"Kuryer agar o'sha aytganingizdek tanishlarga bitta telefoniga o'rnatib qo'yishimiz mumkin. 'Yetkazib beradimi yo'q?' 'Yetkazib berdim' degan bitta bossa, botdan, Telegram botdan."*

> *"Uje sizga ham xabar keladi, obshiy gruppaga: 'Yetkazildi'. Mijozga ham xabar boradi."*

**Yechim**:

1. **Filtrlash** — `Bugungi yetkazishlar` faqat `order.driverPhone` shu haydovchining telefoniga mos kelgan buyurtmalarni ko'rsatsin
2. **"✅ Yetkazdim" tugmasi**:
   - Haydovchi buyurtma raqamini tanlaydi (masalan inline keyboard: MF-260910-xxx)
   - Bosilsa: `order.deliveredAt = now()`, `order.status → DELIVERED` (agar hali bo'lmasa)
   - **Guruhga xabar**: *"MF-260910-xxx yetkazildi"*
   - **Mijozga xabar**: *"Yetkazildi. Oldingizmi? [Ha]"* (yuqoridagi 2.4-bandga qarang)
3. **"💰 Yo'l kira" tugmasi**:
   - Haydovchi shu kunda nechta yetkazish qilgani va jami yo'l kira (`order.deliveryCost` yig'indisi) ko'rsatiladi
   - *"Sizga bugun necha marta olib bordingiz, jami X so'm yo'l kira"*

### 4.4. Kim to'lov oldi/bermadi kuzatuvi (meeting 46:39–47:00) 🔧

> *"Kuryer olib bordi, bermadi, keyin yig'ib beramiz. U bizning anaqamizda ko'rinib turadi."*

Haydovchiga tegishli `deliveryCost` to'langan/to'lanmagan holatini web tomonda (`Order.deliveryPaidAt`) kuzatish — bu allaqachon schema'da bor, faqat UI/bot ulanishi kerak.

---

## 5. Guruh integratsiyasi (hali umuman yo'q) 🔧🔧

> *"O'shani o'zi bot qilish kerak, uni deylik bu bilan men ko'rib tursak ham yaxshi, umumiy gruppaga kelaveradi-ku xabar."*

**Kerak**:
1. Botni bir **Telegram guruhga** qo'shish (siz + Alisher aka + boshqa xodimlar)
2. `TELEGRAM_GROUP_CHAT_ID` — sozlamalarda saqlanadi
3. Quyidagi voqealarda guruhga avtomatik xabar:
   - Yangi buyurtma so'rovi keldi (mijozdan)
   - Buyurtma "Ishlab chiqarildi" (sex tugmani bosdi)
   - Buyurtma "Yetkazildi" (haydovchi tugmani bosdi)
   - Xomashyo yetmadi (PROCESSING bosqichida ogohlantirish)
   - Kam qoldiq (ombor)

**Sizdan kerak**: guruh yaratib, botni qo'shib, guruh Chat ID'sini bering (`/api/telegram/group-id` orqali oson topsa bo'ladi — men shu buyruqni ham qo'shib qo'yaman).

---

## 6. Sex mudiri uchun — "Chiqarib bo'ldim" tugmasi (meeting 40:34–40:46) 🔧

> *"Qilib bo'lganlarida sexda anaqa ekran turibdi, bitta bosdilar qilib bo'lindi. Qilib bo'lindi bossa, gruppaga zakaz tayyor."*

Bu **web tomonda** — Sex mudiri (Alisher aka) login qilib, buyurtmani **"Tayyor" (READY)** ga o'tkazganda, avtomatik guruhga xabar ketishi kerak (5-band bilan birga qurilishi kerak).

---

## 7. Ustuvorlik — nimadan boshlash kerak

| # | Vazifa | Muhimlik | Taxminiy vaqt |
|---|---|---|---|
| 1 | Ta'minotchiga avtomatik xabar (konteyner qabul + to'lov) | ⭐⭐⭐ | 20 daq |
| 2 | Mijoz "Yangi buyurtma" — so'rov (inquiry) tizimi | ⭐⭐⭐ | 25 daq |
| 3 | Haydovchi "Yetkazdim" tugmasi + mijozga tasdiqlash | ⭐⭐⭐ | 25 daq |
| 4 | Guruh integratsiyasi (barcha avtomatik xabarlar uchun asos) | ⭐⭐⭐ | 15 daq |
| 5 | Haydovchi "Bugungi yetkazishlar" filtrlash (faqat o'ziniki) | ⭐⭐ | 10 daq |
| 6 | Qarz eslatmasi (juma kuni, cron) | ⭐⭐ | 15 daq |
| 7 | Haydovchi "Yo'l kira" hisoboti | ⭐ | 10 daq |
| 8 | Ovozli xabar (Gemini) | — (2-etap) | keyinroq |

---

## 8. Sizdan kerak bo'ladigan narsalar

1. **Telegram guruh** — yaratib, botni qo'shing, admin qiling
2. **Haqiqiy telefon raqamlar** — ta'minotchi, mijoz, haydovchi (test uchun emas, ishlaydigan) ro'yxati
3. **Tasdiqlash**: 7-banddagi ustuvorlik tartibi to'g'rimi, yoki boshqacha tartibda qilaylikmi?
