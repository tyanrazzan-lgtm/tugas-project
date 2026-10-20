
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import db from "../db/index.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

interface Pelanggan extends RowDataPacket {
  id_pelanggan: number;
  nama_pelanggan: string;
  email: string;
  no_hp: string | null;
  alamat: string | null;
}

// GET semua pelanggan
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query<Pelanggan[]>(
      "SELECT * FROM tb_pelanggan ORDER BY id_pelanggan DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data pelanggan" });
  }
});

// GET pelanggan berdasarkan ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID pelanggan tidak valid" });
      return;
    }

    const [rows] = await db.execute<Pelanggan[]>(
      "SELECT * FROM tb_pelanggan WHERE id_pelanggan = ?",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Pelanggan tidak ditemukan" });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil pelanggan" });
  }
});

// POST tambah pelanggan
router.post("/", async (req, res) => {
  try {
    const { nama_pelanggan, email, no_hp, alamat } = req.body;

    if (
      typeof nama_pelanggan !== "string" ||
      !nama_pelanggan.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      res.status(400).json({
        message: "Nama pelanggan dan email wajib diisi",
      });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_pelanggan
       (nama_pelanggan, email, no_hp, alamat)
       VALUES (?, ?, ?, ?)`,
      [
        nama_pelanggan.trim(),
        email.trim(),
        no_hp || null,
        alamat || null,
      ]
    );

    res.status(201).json({
      message: "Pelanggan berhasil ditambahkan",
      id_pelanggan: result.insertId,
    });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Email sudah digunakan" });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Gagal menambahkan pelanggan" });
  }
});

// PUT ubah pelanggan
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nama_pelanggan, email, no_hp, alamat } = req.body;

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      typeof nama_pelanggan !== "string" ||
      !nama_pelanggan.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      res.status(400).json({ message: "Data pelanggan tidak valid" });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE tb_pelanggan
       SET nama_pelanggan = ?, email = ?, no_hp = ?, alamat = ?
       WHERE id_pelanggan = ?`,
      [nama_pelanggan.trim(), email.trim(), no_hp || null, alamat || null, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Pelanggan tidak ditemukan" });
      return;
    }

    res.json({ message: "Pelanggan berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Email sudah digunakan" });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Gagal memperbarui pelanggan" });
  }
});

// DELETE pelanggan
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID pelanggan tidak valid" });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM tb_pelanggan WHERE id_pelanggan = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Pelanggan tidak ditemukan" });
      return;
    }

    res.json({ message: "Pelanggan berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal menghapus pelanggan. Periksa apakah pelanggan memiliki transaksi.",
    });
  }
});

export default router;
