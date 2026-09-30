# OYBEK SysteM — frontend + backend bitta servisda

```
oybek-system/
  frontend/   — Vite + React (build qilinib frontend/dist ga chiqadi)
  backend/    — Express + Postgres (Neon). API: /api/...  |  Frontend: qolgan hamma yo'l
  package.json, render.yaml
```

Backend `frontend/dist` ni o'zi beradi, frontend esa API'ga nisbiy yo'l (`/api/...`)
bilan murojaat qiladi — shuning uchun bitta domen, bitta servis, CORS muammosi yo'q.

## Render'da (bitta Web Service)

| Maydon | Qiymat |
|---|---|
| Root Directory | (bo'sh qoldiring) |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment Variables (backenddagi `.env` dagilar): `DATABASE_URL`, `JWT_SECRET`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CRON_SECRET`.
`PORT` ni Render o'zi beradi. `VITE_BACKEND_URL` ni **qo'ymang**.

## Lokal ishlatish

Bitta serverda (production kabi):
```bash
npm run build        # frontend'ni build qiladi + backend paketlarini o'rnatadi
cd backend && cp .env.example .env   # DATABASE_URL va boshqalarni to'ldiring
npm start            # http://localhost:5000 — sayt ham, API ham
```

Dev rejimda (ikki terminal, hot reload):
```bash
npm run dev:backend    # :5000
npm run dev:frontend   # :3000 (avtomatik localhost:5000 ga ulanadi)
```
