
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import db from "../db/index.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

interface Produk extends RowDataPacket {
    id_produk: number;
    id_kategori: number;
    nama_produk: string;
    deskripsi: string | null;
    harga: number;
    gambar: string | null;
}

const produkSchema = z.object({
    id_kategori: z.number().int().positive(),
    nama_produk: z.string().trim().min(2).max(150),
    deskripsi: z.string().trim().optional(),
    harga: z.number().positive(),
    gambar: z.string().trim().max(255).optional(),
});

// GET: Semua produk
router.get("/", async (_req, res) => {
    try {
        const [rows] = await db.execute<Produk[]>(
            `SELECT p.id_produk, p.id_kategori, k.nama_kategori,
                    p.nama_produk, p.deskripsi, p.harga, p.gambar
             FROM tb_produk p
             JOIN tb_kategori k ON p.id_kategori = k.id_kategori
             ORDER BY p.id_produk DESC`
        );

        return res.status(200).json({
            message: "Data produk berhasil diambil",
            data: rows,
        });
    } catch (error) {
        console.error("Get produk error:", error);
        return res.status(500).json({
            message: "Gagal mengambil data produk",
        });
    }
});

// GET: Detail produk berdasarkan ID
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: "ID produk tidak valid",
        });
    }

    try {
        const [rows] = await db.execute<Produk[]>(
            `SELECT p.id_produk, p.id_kategori, k.nama_kategori,
                    p.nama_produk, p.deskripsi, p.harga, p.gambar
             FROM tb_produk p
             JOIN tb_kategori k ON p.id_kategori = k.id_kategori
             WHERE p.id_produk = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Produk tidak ditemukan",
            });
        }

        return res.status(200).json({
            message: "Detail produk berhasil diambil",
            data: rows[0],
        });
    } catch (error) {
        console.error("Get detail produk error:", error);
        return res.status(500).json({
            message: "Gagal mengambil detail produk",
        });
    }
});

// POST: Tambah produk
// POST: Tambah produk
router.post("/", async (req, res) => {
  try {
    const {
      id_kategori,
      nama_produk,
      deskripsi,
      harga,
      gambar,
    } = req.body;

    if (
      !id_kategori ||
      !nama_produk ||
      !deskripsi ||
      harga === undefined ||
      harga === null
    ) {
      return res.status(400).json({
        message: "Data produk belum lengkap",
      });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_produk
       (id_kategori, nama_produk, deskripsi, harga, gambar)
       VALUES (?, ?, ?, ?, ?)`,
      [id_kategori, nama_produk, deskripsi, harga, gambar ?? null]
    );

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT
         p.id_produk,
         p.id_kategori,
         k.nama_kategori,
         p.nama_produk,
         p.deskripsi,
         p.harga,
         p.gambar
       FROM tb_produk p
       JOIN tb_kategori k ON p.id_kategori = k.id_kategori
       WHERE p.id_produk = ?`,
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("POST produk error:", error);
    return res.status(500).json({
      message: "Gagal menambahkan produk",
    });
  }
});
// PUT: Ubah produk
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const { id_kategori, nama_produk, deskripsi, harga, gambar } = req.body;

  if (!id || !id_kategori || !nama_produk || harga == null) {
    return res.status(400).json({
      message: "Data produk belum lengkap",
    });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE tb_produk
       SET id_kategori = ?, nama_produk = ?,
           deskripsi = ?, harga = ?, gambar = ?
       WHERE id_produk = ?`,
      [id_kategori, nama_produk, deskripsi ?? null,
       harga, gambar ?? null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Produk berhasil diubah",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal mengedit produk",
    });
  }
});

// DELETE: Hapus produk
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM tb_produk WHERE id_produk = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Produk berhasil dihapus",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal menghapus produk",
    });
  }
});

export default router;
