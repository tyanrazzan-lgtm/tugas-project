
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";

const router = Router();

interface Admin extends RowDataPacket {
  id_admin: number;
  nama_admin: string;
  username: string;
  email: string;
  password: string;
}

router.post("/register", async (req, res) => {
  try {
    const { nama_admin, username, email, password } = req.body;

    if (
      typeof nama_admin !== "string" ||
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !nama_admin.trim() ||
      !username.trim() ||
      !email.trim() ||
      password.length < 6
    ) {
      return res.status(400).json({
        message: "Nama, username, email, dan password minimal 6 karakter wajib diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const [existing] = await db.execute<Admin[]>(
      "SELECT id_admin FROM tb_admin WHERE email = ? OR username = ? LIMIT 1",
      [normalizedEmail, normalizedUsername]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email atau username sudah terdaftar",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_admin
       (nama_admin, username, email, password)
       VALUES (?, ?, ?, ?)`,
      [nama_admin.trim(), normalizedUsername, normalizedEmail, hashedPassword]
    );

    return res.status(201).json({
      message: "Register berhasil",
      data: {
        id_admin: result.insertId,
        nama_admin: nama_admin.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Register gagal. Periksa struktur tabel database.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Username dan password wajib diisi",
      });
    }

    const [rows] = await db.execute<Admin[]>(
      `SELECT id_admin, nama_admin, username, email, password
       FROM tb_admin
       WHERE username = ?
       LIMIT 1`,
      [username.trim()]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({
        message: "Username atau password salah",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      admin.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Username atau password salah",
      });
    }

    console.log("Username ditemukan:", admin.username);
console.log("Password cocok:", validPassword);

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET belum diatur di file .env",
      });
    }

    const token = jwt.sign(
      { id_admin: admin.id_admin },
      secret,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token,
      data: {
        id_admin: admin.id_admin,
        nama_admin: admin.nama_admin,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login gagal. Periksa database.",
    });
  }
});

export default router;
