# Rollar — kim nima ish qiladi

**Loyiha**: OneShop ERP — Polizol ishlab chiqarish
**Asos**: Meeting transkripti

---

## Web tizimga kiradigan rollar (login/parol bilan)

### 1. 🟣 Rahbar (siz — egasi)

**Ko'radi**: hammasini, cheklovsiz.

**Ish vazifasi**:
- Umumiy nazorat — kunlik/haftalik/oylik foyda-zarar, oborot ko'radi
- Har mijozning **kredit limitini** belgilaydi (kimga qancha nasiya berish mumkin)
- Har mijozning **reytingini** (ishonchli/firibgar) belgilaydi
- **Mijoz marja hisoboti** orqali kim ko'p foyda keltirayotganini, kimga qancha skidka berilganini ko'radi
- Qarzdorlar ro'yxatini ko'radi (o'zining va bozorlarning alohida)
- Xodimlar oyligini, KPI/bonusni belgilaydi
- Yangi foydalanuvchi (xodim) qo'shadi, rol beradi

---

### 2. 🔵 Sotuvchi / Menejer

**Ko'radi**: faqat o'ziga tegishli buyurtmalar va mijozlar (rahbar — hammasini).

**Ish vazifasi**:
- Mijoz bilan gaplashadi, buyurtma qabul qiladi (`Yangi buyurtma`)
- Buyurtma bosqichlarini yuritadi: so'rov → maslahat → narx kelishildi → buyurtma olindi → yetkazilmoqda → yakunlandi
- Yangi mijoz qo'shadi
- Kassada (do'kon/bozor) naqd sotuv qiladi
- Chegirma/skidka beradi (agar ruxsati bo'lsa)

---

### 3. 🟠 Sex mudiri (Alisher aka)

**Ko'radi**: ishlab chiqarish buyurtmalari, ombor, xomashyo, xodimlar (ish jarayoni).

**Ish vazifasi**:
- Kelgan xomashyoni **qabul qiladi va tekshiradi** (qog'ozga qarab, kelgan miqdorni tasdiqlaydi)
- Har kuni **qaysi qozonga nima solish kerakligini** (retsept/zapravka) belgilaydi
- Ishchilarga topshiriq beradi, ish jarayonini kuzatadi (2 qozon, smena)
- Mahsulot tayyor bo'lgach — buyurtmani **"Tayyor" (READY)** holatiga o'tkazadi → tizim xomashyoni avtomatik ombordan ayiradi
- Xomashyo yetishmasa — ogohlantirish oladi
- Xodimlar davomatini (kim ishladi, necha soat) nazorat qiladi

---

### 4. 🟢 Omborchi

**Ko'radi**: ombor, konteynerlar, katalog (o'qish uchun), buyurtmalar (o'qish uchun).

**Ish vazifasi**:
- Ombordagi **qoldiqni** kuzatadi (necha kilo bitum, necha m² steklaxolst qolgan)
- Konteyner (xomashyo) kelganda — miqdorini kiritadi
- Filiallar orasida mahsulot ko'chirilsa — **ichki o'tkazma** yaratadi
- Kam qoldiq bo'lsa — ko'radi/ogohlantiriladi
- Mijozga chiqarilgan mahsulotni (tayyor Polizol) hisobdan yozadi

---

### 5. 🟡 Buxgalter

**Ko'radi**: **faqat** moliya, hisobotlar, mijozlar ro'yxati (kim shot-faktura yopganini). Ombor, ishlab chiqarish, xodim bo'limlari — ko'rinmaydi.

**Ish vazifasi**:
- Kirim-chiqim tranzaksiyalarini yuritadi (kassa/bank, so'm/dollar)
- Hisoblar (kassa, bank, valyuta) holatini kuzatadi
- Qarzdorlik hisobotlarini chiqaradi
- Mijozlarning **shot-faktura yopilgan/yopilmaganini** belgilab boradi
- Oylik/yillik moliyaviy hisobotlarni tayyorlaydi

---

## Faqat Telegram bot orqali ishlaydigan rollar (web'ga kirmaydi)

### 6. 🔵 Ta'minotchi

**Ish vazifasi (o'z nuqtai nazaridan)**:
- Bizga xomashyo (bitum, folga, steklaxolst, mel) yetkazib beradi
- Telegram bot orqali: necha mahsulot qabul qilinganini, qancha to'langanini, joriy qarzni (bizga qancha qarzimiz borligini) ko'radi
- Sverka (hisob-kitobni solishtirish) uchun ma'lumotni tekshirib boradi

### 7. 🟢 Mijoz

**Ish vazifasi (o'z nuqtai nazaridan)**:
- Bizdan Polizol xarid qiladi
- Telegram bot orqali: buyurtmalarini, joriy qarzini, buyurtma holatini (tayyor/yo'lda) ko'radi
- Yangi buyurtma so'rovini yozadi (bot orqali, telefon qilmasdan)
- Yetkazib berilganda — "Oldim" deb tasdiqlaydi

### 8. 🟠 Haydovchi

**Ish vazifasi (o'z nuqtai nazaridan)**:
- Tayyor mahsulotni mijozga yetkazib beradi
- Telegram bot orqali: bugungi yetkazishlar ro'yxatini (qayerga, kimga, qancha) ko'radi
- Yetkazib bo'lgach — **"Yetkazdim"** tugmasini bosadi
- Yo'l kira (dostavka puli) qancha berilgan/qolganini ko'radi

---

## Qisqa jadval

| # | Rol | Qayerda ishlaydi | Asosiy vazifasi bir gapda |
|---|---|---|---|
| 1 | Rahbar | Web (hammasi ochiq) | Nazorat qiladi, qaror qabul qiladi |
| 2 | Sotuvchi | Web | Mijoz bilan ishlaydi, buyurtma oladi |
| 3 | Sex mudiri | Web | Ishlab chiqarishni boshqaradi |
| 4 | Omborchi | Web | Ombor qoldig'ini yuritadi |
| 5 | Buxgalter | Web | Moliya va hisobotlarni yuritadi |
| 6 | Ta'minotchi | Telegram | Xomashyo yetkazadi, qarzini ko'radi |
| 7 | Mijoz | Telegram | Buyurtma beradi, qarzini ko'radi |
| 8 | Haydovchi | Telegram | Yetkazadi, "Yetkazdim" belgilaydi |
