// Vaqtinchalik ID generator (frontend-only bosqich uchun).
// Backend ulanganda bu funksiyaga ehtiyoj qolmaydi — ID'ni server (Neon) beradi.
export function generateId() {
  return crypto.randomUUID();
}
