import { pool } from "../../db/pool.js";

const CBU_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";

export async function fetchCbuRate() {
  const response = await fetch(CBU_URL);
  if (!response.ok) {
    throw new Error(`CBU so'rovi muvaffaqiyatsiz: ${response.status}`);
  }
  const data = await response.json();
  // Frontenddagi exchangeRateService.js bilan bir xil maydon: Ccy === "USD"
  const usd = data.find((item) => item.Ccy === "USD");
  if (!usd) {
    throw new Error("CBU javobida USD topilmadi");
  }
  return Number(usd.Rate);
}

export async function getCurrentRate() {
  const { rows } = await pool.query(
    "SELECT * FROM cbu_rate_log ORDER BY recorded_at DESC LIMIT 1"
  );
  if (rows.length === 0) return null;
  return { rate: Number(rows[0].rate), recordedAt: rows[0].recorded_at };
}

export async function syncFromCbu(force = false) {
  if (!force) {
    const current = await getCurrentRate();
    if (current && current.recordedAt) {
      const recordedTime = new Date(current.recordedAt).getTime();
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (now - recordedTime < ONE_DAY_MS && current.rate > 0) {
        return current;
      }
    }
  }

  try {
    const rate = await fetchCbuRate();
    const { rows } = await pool.query(
      "INSERT INTO cbu_rate_log (rate) VALUES ($1) RETURNING *",
      [rate]
    );
    return { rate: Number(rows[0].rate), recordedAt: rows[0].recorded_at };
  } catch (err) {
    const current = await getCurrentRate();
    if (current) return current;
    throw err;
  }
}

export async function logRate(rate) {
  const { rows } = await pool.query(
    "INSERT INTO cbu_rate_log (rate) VALUES ($1) RETURNING *",
    [rate]
  );
  return { rate: Number(rows[0].rate), recordedAt: rows[0].recorded_at };
}
