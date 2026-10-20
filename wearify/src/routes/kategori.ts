import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import db from "../db/index.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

interface Kategori extends RowDataPacket {
    id_kategori: number;
    nama_kategori: string;
    deskripsi: string | null;
}

const kategoriSchema = z.object({
    nama_kategori: z.string().trim().min(2).max(100),
    deskripsi: z.string().trim().optional(),
});

// GET: Menampilkan semua kategori
router.get("/", async (_req, res) => {
    try {
        const [rows] = await db.execute<Kategori[]>(
            `SELECT id_kategori, nama_kategori, deskripsi
             FROM tb_kategori
             ORDER BY id_kategori DESC`
        );

        return res.status(200).json({
            message: "Data kategori berhasil diambil",
            data: rows,
        });
    } catch (error) {
        console.error("Get kategori error:", error);

        return res.status(500).json({
            message: "Gagal mengambil data kategori",
        });
    }
});

// POST: Menambahkan kategori
router.post("/", authMiddleware, async (req, res) => {
  // 1. Validasi request body menggunakan Zod
  const parsed = kategoriSchema.safeParse(req.body); // ganti kategoriSchema sesuai nama schema Zod kamu

  // 2. Cek jika validasi gagal
  if (!parsed.success) {
    return res.status(400).json({
      message: "Data kategori tidak valid",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  // 3. Ambil data hasil validasi yang sudah aman
  const { nama_kategori, deskripsi } = parsed.data;

  // 4. Simpan ke database
  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_kategori (nama_kategori, deskripsi) VALUES (?, ?)`,
      [nama_kategori, deskripsi ?? null]
    );

    return res.status(201).json({
      message: "Kategori berhasil ditambahkan",
      id: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Gagal menambahkan kategori", error });
  }
});


// PUT: Mengubah kategori
router.put("/:id", authMiddleware, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: "ID kategori tidak valid",
        });
    }

    const parsed = kategoriSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Data kategori tidak valid",
            errors: parsed.error.flatten().fieldErrors,
        });
    }

    const { nama_kategori, deskripsi } = parsed.data;

    try {
        const [result] = await db.execute<ResultSetHeader>(
            `UPDATE tb_kategori
             SET nama_kategori = ?, deskripsi = ?
             WHERE id_kategori = ?`,
            [nama_kategori, deskripsi ?? null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Kategori tidak ditemukan",
            });
        }

        return res.status(200).json({
            message: "Kategori berhasil diubah",
        });
    } catch (error) {
        console.error("Put kategori error:", error);

        return res.status(500).json({
            message: "Gagal mengubah kategori",
        });
    }
});

// DELETE: Menghapus kategori
router.delete("/:id", authMiddleware, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: "ID kategori tidak valid",
        });
    }

    try {
        const [result] = await db.execute<ResultSetHeader>(
            `DELETE FROM tb_kategori
             WHERE id_kategori = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Kategori tidak ditemukan",
            });
        }

        return res.status(200).json({
            message: "Kategori berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete kategori error:", error);

        return res.status(500).json({
            message: "Gagal menghapus kategori. Pastikan kategori tidak sedang digunakan produk.",
        });
    }
});

export default router;