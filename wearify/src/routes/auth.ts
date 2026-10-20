
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db from "../db/index.js";

const router = Router();

interface Admin extends RowDataPacket {
    id_admin: number;
    nama_admin: string;
    username: string;
    email: string;
    password: string;
}

// VALIDASI REGISTER
const registerSchema = z.object({
    nama_admin: z.string().trim().min(2).max(100),
    username: z.string().trim().min(3).max(50),
    email: z.string().trim().email().max(150),
    password: z.string().min(8).max(72),
});

// VALIDASI LOGIN
const loginSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1).max(72),
});

// ========================
// REGISTER ADMIN
// ========================
router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Data register tidak valid",
            errors: parsed.error.flatten().fieldErrors,
        });
    }

    const { nama_admin, username, email, password } = parsed.data;

    if (bcrypt.truncates(password)) {
        return res.status(400).json({
            message: "Password terlalu panjang untuk diproses",
        });
    }

    try {
        // Cek username atau email
        const [existing] = await db.execute<RowDataPacket[]>(
            `SELECT id_admin
             FROM tb_admin
             WHERE username = ? OR email = ?
             LIMIT 1`,
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Username atau email sudah digunakan",
            });
        }

        // Enkripsi password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan admin ke database
        const [result] = await db.execute<ResultSetHeader>(
            `INSERT INTO tb_admin
             (nama_admin, username, email, password)
             VALUES (?, ?, ?, ?)`,
            [nama_admin, username, email, hashedPassword]
        );

        return res.status(201).json({
            message: "Register berhasil",
            data: {
                id_admin: result.insertId,
                nama_admin,
                username,
                email,
            },
        });
    } catch (error) {
        console.error("Register error:", error);

        // Antisipasi duplikat jika terjadi request bersamaan
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ER_DUP_ENTRY"
        ) {
            return res.status(409).json({
                message: "Username atau email sudah digunakan",
            });
        }

        return res.status(500).json({
            message: "Terjadi kesalahan pada server",
        });
    }
});

// ========================
// LOGIN ADMIN
// ========================
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Username atau password tidak valid",
        });
    }

    const { username, password } = parsed.data;

    try {
        // Cari admin berdasarkan username
        const [rows] = await db.execute<Admin[]>(
            `SELECT id_admin, nama_admin, username, email, password
             FROM tb_admin
             WHERE username = ?
             LIMIT 1`,
            [username]
        );

        // Username tidak ditemukan
        if (rows.length === 0) {
            return res.status(401).json({
                message: "Username atau password salah",
            });
        }

        const admin = rows[0];

        if (!admin) {
            return res.status(401).json({
                message: "Username atau password salah",
            });
        }

        // Bandingkan password input dengan hash di database
        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        // Password tidak cocok
        if (!passwordMatch) {
            return res.status(401).json({
                message: "Username atau password salah",
            });
        }

        // Periksa secret JWT
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error("JWT_SECRET belum diatur");

            return res.status(500).json({
                message: "Konfigurasi server belum lengkap",
            });
        }

        // Buat token JWT
        const token = jwt.sign(
            {
                id_admin: admin.id_admin,
                username: admin.username,
            },
            secret,
            { expiresIn: "2h" }
        );

        // Login berhasil
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
            message: "Terjadi kesalahan pada server",
        });
    }
});

export default router;
