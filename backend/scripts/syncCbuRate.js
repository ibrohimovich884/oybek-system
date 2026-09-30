// Render Cron Job uchun mustaqil skript.
// Ishlatish (Render "Command" maydonida): node scripts/syncCbuRate.js
import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db/pool.js";
import { syncFromCbu } from "../src/services/dollarRateService.js";

async function run() {
  try {
    const result = await syncFromCbu();
    console.log(`CBU kursi yozildi: 1 USD = ${result.rate} UZS (${result.recordedAt})`);
  } catch (err) {
    console.error("CBU sinxronizatsiya xatosi:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
