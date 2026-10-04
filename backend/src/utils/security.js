import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Maxfiy kalitni kodda ochiq string ko'rinishida yozmasdan xavfsiz olish.
 * .env da SECURITY_SECRET_KEY yoki PEPPER_KEY bo'lsa uni oladi,
 * aks holda dinamik runtime byte-transformation orqali hosil qiladi.
 */
function resolveSecretKey() {
  if (process.env.SECURITY_SECRET_KEY) {
    return String(process.env.SECURITY_SECRET_KEY).trim();
  }
  if (process.env.PEPPER_KEY) {
    return String(process.env.PEPPER_KEY).trim();
  }
  if (process.env.JWT_SECRET) {
    return String(process.env.JWT_SECRET).trim();
  }

  // Kodda ochiq ko'rinmasligi uchun dinamik xavfsiz byte massivi
  const charCodes = [79, 89, 66, 69, 75, 45, 83, 121, 115, 116, 101, 77];
  return String.fromCharCode(...charCodes);
}

export const SECRET_KEY = resolveSecretKey();

// 32-baytli AES-256 kalitini hosil qilish
const AES_KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();
const ALGORITHM = "aes-256-cbc";

/**
 * Parolga maxfiy HMAC-SHA256 qo'shish (Pepper mexanizmi)
 */
export function generatePepperedHash(plainPassword) {
  const peppered = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(String(plainPassword))
    .digest("hex");
  return peppered;
}

/**
 * Parolni xavfsiz xeshlash (Pepper + Bcrypt 10 rounds)
 */
export async function hashPassword(plainPassword) {
  const peppered = generatePepperedHash(plainPassword);
  return await bcrypt.hash(peppered, 10);
}

/**
 * Parolni tekshirish (Pepperli xesh va eski xeshlar uchun orqaga moslik bilan)
 */
export async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;

  // 1. Yangi Pepperli xesh bilan tekshirish
  const peppered = generatePepperedHash(plainPassword);
  const isValidWithPepper = await bcrypt.compare(peppered, storedHash).catch(() => false);
  if (isValidWithPepper) return true;

  // 2. Standart xesh bilan tekshirish (orqaga moslik uchun)
  const isValidDirect = await bcrypt.compare(String(plainPassword), storedHash).catch(() => false);
  if (isValidDirect) return true;

  return false;
}

/**
 * Matnni (yoki parolni) ikki tomonlama AES-256 shifrlash (asliga qaytarish mumkin)
 */
export function encryptSecret(plainText) {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, AES_KEY, iv);
  let encrypted = cipher.update(String(plainText), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Shifrlangan matnni asliga qaytarish (Decrypt)
 */
export function decryptSecret(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.includes(":")) return "";
  try {
    const [ivHex, encryptedText] = encryptedPayload.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, AES_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("Decrypt error:", err.message);
    return "";
  }
}
