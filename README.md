# Bilimdon

Sinfda jonli viktorina o'tkazish uchun sayt: o'qituvchi savollarni katta ekranga chiqaradi,
o'quvchilar telefonidan PIN kod bilan kirib javob beradi.

**▶ Jonli demo:** https://ikhtiyorbek28.github.io/Bilimdon/ — serversiz: o'qituvchi ekrani va
o'quvchi telefoni yonma-yon, boshqa o'yinchilar botlar. Demo `docs/` papkasida; sayt fayllari
o'zgarsa, `python tools/build_docs.py` umumiy fayllarni (`style.css`, avatarlar) u yerga ko'chiradi.

## Ishga tushirish

Kerak: **Python 3.10+** (boshqa hech narsa o'rnatish shart emas).

- Windows: `start.bat` ni ikki marta bosing — brauzer o'zi ochiladi.
- Yoki: `bilimdon` papkasida `python server.py`, keyin brauzerda `http://localhost:8000`.

O'quvchilar telefonda lobbida ko'rsatilgan manzilni (yoki QR kodni) ochadi — kompyuter bilan
bir xil Wi-Fi tarmog'ida bo'lishi kerak.

| Sahifa | Kim uchun |
|---|---|
| `/` | O'yinchilar: PIN va ism bilan o'yinga kirish, mashq havolasi |
| `/host` | O'qituvchilar: kirish, viktorinalar, o'yin o'tkazish, hisobotlar |
| `/help` | O'qituvchilar uchun qo'llanma (uz/ru/en) — panel menyusida "📘 Qo'llanma" |
| `/privacy`, `/terms` | Huquqiy sahifalar (⚠️ hozircha qoralama — yurist tekshirishi kerak) |

## Imkoniyatlar

**Savol turlari (12):** viktorina, to'g'ri/noto'g'ri, bir nechta javob, javobni yozish, tartiblash,
so'rovnoma, slayd, so'zlar buluti, ochiq javob, shkala, rasmda belgilash, aqliy hujum (ovoz berish bilan).

**Muharrir:** rasm/YouTube/audio, rasmli javoblar, izoh (javobdan keyin chiqadi), ikki baravar ball,
Excel/CSV va matndan import, savollar banki, sinab ko'rish, ✨ AI bilan yaratish*, 🔍 rasm qidirish*.

**O'yin:** jamoalar, aniqlik rejimi, o'qish vaqti, tasodifiy N ta savol, savol/javoblarni aralashtirish,
pauza, avtomatik davom, ovozli o'qish, reaksiyalar, arvohlarga qarshi o'yin, poyga ko'rinishi,
sinf ro'yxati bo'yicha kirish, podium, o'yinchilar bahosi, o'yin oxirida javoblar tahlili.

**Boshqalar:** vazifalar (uyga), mashq havolasi (kartochkalar + test), sinflar va reyting,
hisobotlar (Excel/CSV), sertifikatlar, qog'oz test + javob kaliti, statistika, guruhlar,
hammualliflar, kashf etish, zaxira nusxa/tiklash, tiklash kodi, tungi rejim.

**Tillar:** o'yinchi sahifasi va o'qituvchi paneli — o'zbek, rus, ingliz.

\* kalit kerak — [HOSTING.md](HOSTING.md) ga qarang.

## Ma'lumotlar

Hammasi `data/` papkasida: `bilimdon.db` (SQLite), yuklangan rasm/audio `data/uploads/`,
kunlik zaxira `data/backups/<sana>/` (oxirgi 7 kun).

`data/` GitHub'ga yuklanmaydi (`.gitignore`): unda o'qituvchilar hisoblari va parol xeshlari bor.
Server birinchi ishga tushganda bu papkani o'zi yaratadi.

Parolni unutgan o'qituvchi: ro'yxatdan o'tganda berilgan tiklash kodi bilan kirish sahifasida tiklaydi.
Kod ham yo'qolsa — serverni to'xtatib: `python server.py reset-password LOGIN`.

## Testlar

```
python tests/run_tests.py
```

Testlar o'z serverini vaqtinchalik papkada ishga tushiradi — haqiqiy `data/` ga tegmaydi.
Har bir o'zgarishdan keyin ishga tushirish tavsiya etiladi (51 ta tekshiruv, ~30 soniya).

## Internetga chiqarish

[HOSTING.md](HOSTING.md): domen, HTTPS, proksi, kalitlar (`PUBLIC_URL`, `TRUST_PROXY`, `PIXABAY_KEY`, `ANTHROPIC_API_KEY`).

## Fayllar

| Fayl | Nima |
|---|---|
| `server.py` | Butun server (Python standart kutubxonasi) |
| `public/index.html` | O'yinchi sahifasi |
| `public/host.html` | O'qituvchi paneli |
| `public/i18n.js`, `public/host-i18n.js` | Tarjimalar |
| `public/common.js`, `public/style.css` | Umumiy kod va uslub |
| `public/avatar3d.js` | 3D avatarlar (16 qahramon, 18 aksessuar, ranglar) — three.js CDN orqali; internet bo'lmasa `avatars.js` dagi SVG avatarlar ishlatiladi |
| `public/privacy.html`, `public/terms.html` | Huquqiy sahifalar (qoralama) |
| `tests/run_tests.py` | Avtomatik testlar |
