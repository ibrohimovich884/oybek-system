# Oybek-system — backend (v3, haqiqiy frontend kontraktiga moslangan)

## O'rnatish

```bash
npm install
npm run migrate   # jadvallarni yaratadi
npm run dev
```

Standart port: `5000`. Production frontend `https://oybek-system-backend-1.onrender.com`
manziliga ulanishga urinadi — Render'da xizmat nomini shunga moslang.

## MUHIM: Autentifikatsiya hozircha OCHIQ

Joriy frontend (`1.zip`) hech qanday Authorization header yubormaydi —
shuning uchun `/api/expenses`, `/api/wallets`, `/api/exercises`, `/api/backup`
hozircha auth'siz ishlaydi. `/api/auth/login` va JWT middleware (`src/middleware/auth.js`)
tayyor turibdi — frontendga login oynasi qo'shilganda, `src/app.js`da
kerakli route'larga `requireAuth`ni qo'shish kifoya.

Parolni sozlash uchun:
```bash
node scripts/hashPassword.js "parolingiz"
```
natijani `.env`dagi `ADMIN_PASSWORD_HASH`ga joylashtiring.

## Endpointlar (frontendning haqiqiy kontraktiga mos)

| Metod | Yo'l | Izoh |
|---|---|---|
| GET | /api/health | DB bilan aloqa |
| POST | /api/auth/login | { username, password } -> { token } (hali frontendda ishlatilmaydi) |
| GET/POST | /api/expenses | Tranzaksiyalar |
| PUT/DELETE | /api/expenses/:id | Tahrirlash / o'chirish |
| GET/PUT | /api/wallets | Hamyon/Naqd/Karta/Dollar oddiy balanslari |
| GET/POST | /api/exercises | Mashqlar ro'yxati |
| DELETE | /api/exercises/:id | Mashqni o'chirish |
| GET/POST | /api/exercises/logs | Kunlik bajarilish belgilari |
| GET | /api/exchange-rate/usd | Oxirgi saqlangan CBU kursi (cbu_rate_log) |
| POST | /api/exchange-rate/usd/sync-cbu | CBU.uz'dan yangi kursni olib yozadi |
| GET/POST/PUT/DELETE | /api/debts | Qarzlar va to'lovlar |
| GET/POST | /api/updates | Tizim yangilanishlari va shikoyatlar |

## Control Panel (Rezervlar / Qarzlar / Dollar tarixi) haqida MUHIM eslatma

Frontend hozir bularni **to'liq o'zi, localStorage'da** boshqaradi va
backendga faqat `/api/backup` orqali, to'liq JSON sifatida yuboradi.
Backend bu ma'lumotni `app_snapshot` jadvalida JSONB ko'rinishida,
frontend qanday yuborsa shundayligicha saqlaydi — alohida CRUD
endpoint (masalan `/api/reserves`) YO'Q, chunki frontend hozircha
bunday endpoint'larni chaqirmaydi.

## CBU kursini avtomatik yangilash (Render Cron Job)

`scripts/syncCbuRate.js` — Render'da alohida "Cron Job" xizmati
sifatida sozlanadi:
- Command: `node scripts/syncCbuRate.js`
- Schedule: masalan `0 9 * * *` (har kuni ertalab 09:00)

Bu `cbu_rate_log` jadvaliga yozadi — bu frontendning o'z
`dollarRateHistory` massividan ALOHIDA, faqat backend tomonidan
yuritiladigan kurs jurnali.

## Tuzilma

```
db/
  schema.sql         — wallets, transactions, transaction_edits,
                        app_snapshot (JSONB), cbu_rate_log, exercises, exercise_logs
  pool.js
  migrate.js
scripts/
  hashPassword.js
  syncCbuRate.js       — Render Cron Job uchun
src/
  app.js
  server.js
  middleware/auth.js   — tayyor, hali qo'llanmagan
  routes/                health, auth, expenses, wallets, exercises,
                          exchangeRate, backup
  services/               expensesService, walletsService, exercisesService,
                          dollarRateService
  utils/mapExpense.js
```
