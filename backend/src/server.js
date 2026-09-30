import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { ensureSchema } from "../db/ensureSchema.js";

const PORT = process.env.PORT || 5000;

// Render'da shell yo'q — shuning uchun sxema har ishga tushganda avtomatik tekshiriladi/tuzatiladi.
try {
  const { log, status } = await ensureSchema();
  log.forEach((l) => console.log("[schema]", l));
  if (!status.ok) console.warn("[schema] hali muammolar bor:", JSON.stringify(status.problems));
} catch (err) {
  console.error("[schema] tekshirishda xato (server baribir ishga tushadi):", err.message);
}

app.listen(PORT, () => {
  console.log(`Oybek-system backend ${PORT}-portda ishga tushdi`);
});
