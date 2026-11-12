# Bilimdon'ni internetga chiqarish

Hozir sayt sinf Wi-Fi'sida ishlaydi: `start.bat` → `http://localhost:8000`. Internetga chiqarishda
serverni o'zgartirish shart emas — faqat quyidagi sozlamalar (muhit o'zgaruvchilari) beriladi.

| O'zgaruvchi | Misol | Nima uchun |
|---|---|---|
| `PORT` | `8000` | Server qaysi portda ishlaydi |
| `PUBLIC_URL` | `https://bilimdon.uz` | Lobbidagi manzil va QR kodlar shu manzilni ko'rsatadi |
| `TRUST_PROXY` | `1` | Oldida nginx / Caddy / Cloudflare turganda. Shunda tezlik cheklovlari har bir tashrif buyuruvchining haqiqiy manzilini ko'radi (`X-Forwarded-For`), https'da cookie `Secure` bo'ladi |

| `PIXABAY_KEY` | `12345-abc…` | Muharrirda "🔍 Internetdan rasm qidirish". Bepul kalit: pixabay.com/api/docs (ro'yxatdan o'tgach). Tanlangan rasm serveringizga ko'chiriladi |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Muharrirda "✨ AI bilan yaratish" (Claude Opus 5.5). Kalit: console.anthropic.com. **Pullik** — har bir yaratish so'rovi uchun to'lanadi. Qo'shimcha paket kerak: `pip install anthropic` |

Kalit berilmasa, tegishli tugma ko'rinmaydi — sayt ularsiz ham to'liq ishlaydi.

> ⚠️ `TRUST_PROXY=1` ni faqat server oldida proksi turganda yoqing. Proksisiz yoqilsa,
> har kim `X-Forwarded-For` sarlavhasini o'zi yozib, cheklovlarni chetlab o'tishi mumkin.

## Tavsiya etilgan tuzilma

```
Internet ──https──▶ Caddy yoki nginx (sertifikat, 443-port) ──http──▶ python server.py (127.0.0.1:8000)
```

Caddy misoli (`Caddyfile`) — sertifikatni o'zi oladi:

```
bilimdon.uz {
    reverse_proxy 127.0.0.1:8000 {
        flush_interval -1   # jonli o'yin (SSE) kechikmasligi uchun
    }
}
```

Linux'da ishga tushirish:

```bash
PORT=8000 PUBLIC_URL=https://bilimdon.uz TRUST_PROXY=1 python3 server.py
```

## Esda tuting

- **Ma'lumotlar** `data/bilimdon.db` (SQLite) faylida. Har bir yozuv alohida saqlanadi, faqat
  o'zgargani yoziladi va bitta tranzaksiyada — server to'satdan o'chsa ham fayl buzilmaydi.
  Server har kuni `data/backups/<sana>/bilimdon.db` ga to'liq nusxa oladi (oxirgi 7 kun).
  Bu nusxalar o'sha diskda — vaqti-vaqti bilan boshqa joyga ham ko'chiring.
- Eski JSON fayllardan birinchi ishga tushishda avtomatik ko'chirilgan; ularning nusxasi
  `data/backups/json-before-sqlite/` da turadi.
- **Yuklama**: bitta kompyuterda 100 o'yinchili o'yin sinovdan muammosiz o'tgan. Ma'lumotlar
  hozircha server xotirasida ham turadi, shuning uchun bitta server jarayoni ishlatiladi
  (bir nechta nusxa parallel ishga tushirilmaydi).
- **Parolni tiklash**: e-mail yo'q — ro'yxatdan o'tganda beriladigan tiklash kodi bilan,
  yoki serverda `python server.py reset-password LOGIN` (server to'xtatilgan holda).
- **Huquqiy sahifalar** (maxfiylik siyosati, foydalanish shartlari) hali yo'q — o'quvchilar
  ismlari saqlangani uchun internetga chiqishdan oldin yuristga ko'rsatib tayyorlash kerak.
