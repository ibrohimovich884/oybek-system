// Diagnostika: node scripts/doctor.js   (yoki: npm run doctor)
// Har bir jadvalning ustunlari/qatorlari sonini chiqaradi va HAQIQIY INSERT'ni
// sinab ko'radi (oxirida ROLLBACK — bazada hech narsa qolmaydi).
import dotenv from "dotenv";
dotenv.config();
import { pool } from "../db/pool.js";
import { checkSchema } from "../db/ensureSchema.js";

const tables = ["wallets", "transactions", "transaction_edits", "exercises", "exercise_logs", "app_snapshot"];

async function tryInsert(client, label, sql, params) {
  await client.query("SAVEPOINT s");
  try {
    await client.query(sql, params);
    console.log(`  ✔ ${label}`);
  } catch (e) {
    console.log(`  ✘ ${label}: ${e.message}`);
  }
  await client.query("ROLLBACK TO SAVEPOINT s");
}

const client = await pool.connect();
try {
  for (const t of tables) {
    const cols = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t]);
    const n = cols.rows.length ? (await client.query(`SELECT COUNT(*)::int n FROM ${t}`)).rows[0].n : "yo'q";
    console.log(`\n${t} (qatorlar: ${n})`);
    cols.rows.forEach((c) => console.log(`  ${c.column_name.padEnd(24)} ${c.data_type}${c.is_nullable === "NO" ? "  NOT NULL" : ""}`));
  }
  console.log("\nSxema tekshiruvi:", JSON.stringify(await checkSchema(), null, 2));

  console.log("\nSinov INSERT'lar (ROLLBACK qilinadi):");
  await client.query("BEGIN");
  await tryInsert(client, "transactions",
    `INSERT INTO transactions (id,type,amount,currency,category,subcategory,reason,location,payment_method,wallet,from_wallet,to_wallet,quantity,exchange_rate_at_time,spent_at,created_at)
     VALUES ('doctor_t1','expense',1000,'UZS','Qorin uchun','Ovqat','test','','naqd','naqd',NULL,NULL,1,NULL,'2026-09-29T10:00:00+05:00', now())`);
  await tryInsert(client, "exercises",
    `INSERT INTO exercises (id,name,category,target,duration_minutes,calories,icon,created_at) VALUES ('doctor_e1','t','Umumiy','10 marta',15,50,'Activity','2026-09-29')`);
  await client.query("SAVEPOINT h");
  try {
    await client.query("INSERT INTO exercises (id,name) VALUES ('doctor_e2','t')");
  } catch {
    await client.query("ROLLBACK TO SAVEPOINT h");
  }
  await tryInsert(client, "exercise_logs (ON CONFLICT bilan)",
    `INSERT INTO exercise_logs (id,exercise_id,date,completed,completed_at,details) VALUES ('doctor_l1','doctor_e2','2026-09-29',true,'10:00','{}')
     ON CONFLICT (exercise_id,date) DO UPDATE SET completed=true`);
  await client.query("ROLLBACK");
} finally {
  client.release();
  await pool.end();
}
