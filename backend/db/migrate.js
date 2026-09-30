import { pool } from "./pool.js";
import { ensureSchema } from "./ensureSchema.js";

async function migrate() {
  const { log, status } = await ensureSchema();
  log.forEach((l) => console.log(" •", l));
  if (!status.ok) {
    console.warn("Sxemada hali muammolar bor:", JSON.stringify(status.problems, null, 2));
  }
  console.log("Migratsiya muvaffaqiyatli bajarildi.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migratsiya xatosi:", err.message);
  process.exit(1);
});
