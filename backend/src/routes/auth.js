import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username va password kerak" });
  }

  const validUsername = username === process.env.ADMIN_USERNAME;
  const validPassword =
    process.env.ADMIN_PASSWORD_HASH &&
    (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH));

  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.json({ token });
});

export default router;
