
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import db from "../db/index.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

interface Varian extends RowDataPacket {
  id_varian: number;
  id_produk: number;
  ukuran: string;
  warna: string;
  stok: number;
}

// GET semua varian
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query<Varian[]>(
      `SELECT v.*, p.nama_produk
       FROM tb_varian_produk v
       JOIN tb_produk p ON v.id_produk = p.id_produk
       ORDER BY v.id_varian DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data varian" });
  }
});

// GET varian berdasarkan ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID varian tidak valid" });
      return;
    }

    const [rows] = await db.execute<Varian[]>(
      "SELECT * FROM tb_varian_produk WHERE id_varian = ?",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Varian tidak ditemukan" });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil varian" });
  }
});

// POST tambah varian
router.post("/", async (req, res) => {
  try {
    const { id_produk, ukuran, warna, stok } = req.body;
    const produkId = Number(id_produk);
    const jumlahStok = Number(stok);

    if (
      !Number.isInteger(produkId) ||
      produkId < 1 ||
      typeof ukuran !== "string" ||
      !ukuran.trim() ||
      typeof warna !== "string" ||
      !warna.trim() ||
      !Number.isInteger(jumlahStok) ||
      jumlahStok < 0
    ) {
      res.status(400).json({ message: "Data varian tidak valid" });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_varian_produk
       (id_produk, ukuran, warna, stok)
       VALUES (?, ?, ?, ?)`,
      [produkId, ukuran.trim(), warna.trim(), jumlahStok]
    );

    res.status(201).json({
      message: "Varian berhasil ditambahkan",
      id_varian: result.insertId,
    });
  } catch (error: any) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).json({ message: "Produk tidak ditemukan" });
      return;
    }

    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({
        message: "Ukuran dan warna tersebut sudah ada untuk produk ini",
      });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Gagal menambahkan varian" });
  }
});

// PUT ubah varian
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { id_produk, ukuran, warna, stok } = req.body;
    const produkId = Number(id_produk);
    const jumlahStok = Number(stok);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !Number.isInteger(produkId) ||
      produkId < 1 ||
      typeof ukuran !== "string" ||
      !ukuran.trim() ||
      typeof warna !== "string" ||
      !warna.trim() ||
      !Number.isInteger(jumlahStok) ||
      jumlahStok < 0
    ) {
      res.status(400).json({ message: "Data varian tidak valid" });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE tb_varian_produk
       SET id_produk = ?, ukuran = ?, warna = ?, stok = ?
       WHERE id_varian = ?`,
      [produkId, ukuran.trim(), warna.trim(), jumlahStok, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Varian tidak ditemukan" });
      return;
    }

    res.json({ message: "Varian berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Varian tersebut sudah ada" });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Gagal memperbarui varian" });
  }
});

// DELETE varian
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID varian tidak valid" });
      return;
    }

    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM tb_varian_produk WHERE id_varian = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Varian tidak ditemukan" });
      return;
    }

    res.json({ message: "Varian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal menghapus varian. Periksa apakah varian sudah digunakan dalam transaksi.",
    });
  }
});

export default router;
