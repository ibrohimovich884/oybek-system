// Parolni hash qilish uchun yordamchi skript.
// Ishlatish: node scripts/hashPassword.js "MeningParolim123"
import bcrypt from "bcryptjs";

const plainPassword = process.argv[2];

if (!plainPassword) {
  console.error("Foydalanish: node scripts/hashPassword.js \"parolingiz\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(plainPassword, 10);
console.log("\nQuyidagini .env fayliga ADMIN_PASSWORD_HASH sifatida joylashtiring:\n");
console.log(hash);
console.log("");
