import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon uxlab qolganda ulanish 5s dan uzoqroq ochilishi mumkin
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

// Neon bo'sh ulanishlarni uzib qo'yadi; handler bo'lmasa bu jarayonni qulatadi
pool.on("error", (err) => {
  console.error("PG pool xatosi (e'tiborsiz qoldirildi):", err.message);
});
