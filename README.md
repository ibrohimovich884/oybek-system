# Oybek-system — frontend

## Ishga tushirish

```bash
npm install
npm run dev
```

## Tuzilma

```
src/
  api/expenses.js          — ma'lumotlar qatlami (hozir localStorage, keyin fetch()ga almashtiriladi)
  context/ExpensesContext.jsx — global state (add/update/delete/backup)
  components/
    layout/                — Sidebar, Layout
    notifications/         — Home sahifasidagi bildirishnoma banneri
    money-manager/         — ExpenseForm, ExpenseList, ExpenseRow
  pages/
    Home.jsx
    MoneyManager.jsx
  styles/tokens.css         — rang, shrift, bo'shliq tokenlari
  index.css                 — komponent stillari
```

## Hozirgi holat

- Ma'lumotlar brauzer localStorage'ida saqlanadi (Neon hali ulanmagan).
- `src/api/expenses.js` ichidagi funksiyalar (`getExpenses`, `addExpense`,
  `updateExpense`, `deleteExpense`, `exportBackup`) shu nomlar va imzolar bilan
  qoladi — backend ulanganda faqat shu fayl ichini `fetch()` chaqiruvlariga
  almashtirish kifoya, boshqa komponentlarga tegilmaydi.
- "Belgilangan vaqti" maydoni ixtiyoriy qilib qo'yildi — uning aniq vazifasi
  (masalan, rejalashtirilgan xarajat vaqtimi) keyin aniqlashtirilib, kerak
  bo'lsa mantiq qo'shiladi.

## Keyingi qadam

Node.js + Neon backend qurish va `src/api/expenses.js` ni real API'ga ulash.
