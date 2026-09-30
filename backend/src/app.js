import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import expensesRouter from "./routes/expenses.js";
import walletsRouter from "./routes/wallets.js";
import exercisesRouter from "./routes/exercises.js";
import exchangeRateRouter from "./routes/exchangeRate.js";
import backupRouter from "./routes/backup.js";
import snapshotRouter from "./routes/snapshot.js";

export const app = express();

app.use(cors());
// Backup butun tranzaksiyalar tarixini yuboradi — default 100kb yetmaydi (413 xatosi)
app.use(express.json({ limit: "10mb" }));

app.use("/api/health", healthRouter);

// Login tayyor turibdi (kelajakda frontendga auth qo'shilganda
// requireAuth middleware'ni pastdagi route'larga qo'shish kifoya).
app.use("/api/auth", authRouter);

// ESLATMA: hozirgi frontend (1.zip) Authorization header umuman
// yubormaydi — shuning uchun bu route'lar hozircha OCHIQ.
app.use("/api/expenses", expensesRouter);
app.use("/api/wallets", walletsRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/exchange-rate", exchangeRateRouter);
app.use("/api/backup", backupRouter);
app.use("/api/snapshot", snapshotRouter);

// /api/... dagi noma'lum yo'llar — JSON 404 (frontend HTML bilan aralashmasin)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Topilmadi" });
});

// ---- Frontend (Vite build) shu serverning o'zidan beriladi ----
// Render'da: frontend/dist build vaqtida yaratiladi. Lokal backend-only rejimda dist
// bo'lmasa, bu qism o'tkazib yuboriladi va faqat API ishlaydi.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.resolve(__dirname, "../../frontend/dist");

if (fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      setHeaders(res, filePath) {
        const base = path.basename(filePath);
        // index.html, service worker va manifest doim yangi olinsin (PWA yangilanishi uchun)
        if (base === "index.html" || base === "sw.js" || base === "manifest.webmanifest" || base.startsWith("workbox-")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // SPA: react-router yo'llari (/debts, /settings, ...) uchun index.html
  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
  console.log("[frontend] statik fayllar beriladi:", FRONTEND_DIST);
} else {
  app.use((req, res) => {
    res.status(404).json({ error: "Topilmadi" });
  });
  console.log("[frontend] dist topilmadi — faqat API rejimi:", FRONTEND_DIST);
}

// Xato JSON ko'rinishida qaytsin (aks holda Express HTML yuboradi)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Server xatosi" });
});
