
import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import db from "../db/index.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

interface ItemTransaksi {
  id_produk: number;
  id_varian?: number | null;
  qty: number;
}

interface Produk extends RowDataPacket {
  id_produk: number;
  harga: number;
}

interface Varian extends RowDataPacket {
  id_varian: number;
  id_produk: number;
  stok: number;
}

const statusValid = [
  "pending",
  "diproses",
  "dikirim",
  "selesai",
  "dibatalkan",
];

// GET semua transaksi
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.*, p.nama_pelanggan
       FROM tb_transaksi t
       JOIN tb_pelanggan p
         ON t.id_pelanggan = p.id_pelanggan
       ORDER BY t.id_transaksi DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil transaksi" });
  }
});

// GET transaksi beserta detail produk
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID transaksi tidak valid" });
      return;
    }

    const [transaksi] = await db.execute<RowDataPacket[]>(
      `SELECT t.*, p.nama_pelanggan, p.email
       FROM tb_transaksi t
       JOIN tb_pelanggan p
         ON t.id_pelanggan = p.id_pelanggan
       WHERE t.id_transaksi = ?`,
      [id]
    );

    if (transaksi.length === 0) {
      res.status(404).json({ message: "Transaksi tidak ditemukan" });
      return;
    }

    const [detail] = await db.execute<RowDataPacket[]>(
      `SELECT d.*, p.nama_produk, v.ukuran, v.warna
       FROM tb_detail_transaksi d
       JOIN tb_produk p ON d.id_produk = p.id_produk
       LEFT JOIN tb_varian_produk v ON d.id_varian = v.id_varian
       WHERE d.id_transaksi = ?`,
      [id]
    );

    res.json({
      transaksi: transaksi[0],
      detail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil detail transaksi" });
  }
});

// POST membuat transaksi
router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id_pelanggan, items } = req.body;
    const pelangganId = Number(id_pelanggan);

    if (
      !Number.isInteger(pelangganId) ||
      pelangganId < 1 ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({
        message: "Pelanggan dan minimal satu produk wajib diisi",
      });
      return;
    }

    const daftarItem: ItemTransaksi[] = [];

    for (const item of items) {
      const idProduk = Number(item.id_produk);
      const qty = Number(item.qty);
      const idVarian =
        item.id_varian == null ? null : Number(item.id_varian);

      if (
        !Number.isInteger(idProduk) ||
        idProduk < 1 ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        (idVarian !== null &&
          (!Number.isInteger(idVarian) || idVarian < 1))
      ) {
        res.status(400).json({ message: "Data item transaksi tidak valid" });
        return;
      }

      daftarItem.push({
        id_produk: idProduk,
        id_varian: idVarian,
        qty,
      });
    }

    await connection.beginTransaction();

    const [pelanggan] = await connection.execute<RowDataPacket[]>(
      "SELECT id_pelanggan FROM tb_pelanggan WHERE id_pelanggan = ?",
      [pelangganId]
    );

    if (pelanggan.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: "Pelanggan tidak ditemukan" });
      return;
    }

    const [transaksiResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO tb_transaksi (id_pelanggan, total_harga)
         VALUES (?, 0)`,
        [pelangganId]
      );

    const idTransaksi = transaksiResult.insertId;
    let totalHarga = 0;

    for (const item of daftarItem) {
      const [produkRows] = await connection.execute<Produk[]>(
        "SELECT id_produk, harga FROM tb_produk WHERE id_produk = ?",
        [item.id_produk]
      );

      if (produkRows.length === 0) {
        throw new Error(`Produk ${item.id_produk} tidak ditemukan`);
      }

      const produk = produkRows[0];

if (!produk) {
  throw new Error(`Produk ${item.id_produk} tidak ditemukan`);
}

const harga = Number(produk.harga);

      if (item.id_varian !== null && item.id_varian !== undefined) {
        const [varianRows] = await connection.execute<Varian[]>(
          `SELECT id_varian, id_produk, stok
           FROM tb_varian_produk
           WHERE id_varian = ? AND id_produk = ?
           FOR UPDATE`,
          [item.id_varian, item.id_produk]
        );

        if (varianRows.length === 0) {
          throw new Error("Varian tidak ditemukan untuk produk tersebut");
        }

        const varian = varianRows[0];

if (!varian) {
  throw new Error("Varian tidak ditemukan");
}

if (varian.stok < item.qty) {
  throw new Error("Stok varian tidak mencukupi");
}

        await connection.execute(
          `UPDATE tb_varian_produk
           SET stok = stok - ?
           WHERE id_varian = ?`,
          [item.qty, item.id_varian]
        );
      }

      await connection.execute(
        `INSERT INTO tb_detail_transaksi
         (id_transaksi, id_produk, id_varian, qty, harga)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idTransaksi,
          item.id_produk,
          item.id_varian ?? null,
          item.qty,
          harga,
        ]
      );

      totalHarga += harga * item.qty;
    }

    await connection.execute(
      `UPDATE tb_transaksi
       SET total_harga = ?
       WHERE id_transaksi = ?`,
      [totalHarga, idTransaksi]
    );

    await connection.commit();

    res.status(201).json({
      message: "Transaksi berhasil dibuat",
      id_transaksi: idTransaksi,
      total_harga: totalHarga,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Gagal membuat transaksi",
    });
  } finally {
    connection.release();
  }
});

// PUT mengubah status transaksi
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status_transaksi } = req.body;

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID transaksi tidak valid" });
      return;
    }

    if (
      typeof status_transaksi !== "string" ||
      !statusValid.includes(status_transaksi)
    ) {
      res.status(400).json({ message: "Status transaksi tidak valid" });
      return;
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT status_transaksi FROM tb_transaksi WHERE id_transaksi = ?",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Transaksi tidak ditemukan" });
      return;
    }

    const transaksi = rows[0];

if (!transaksi) {
  res.status(404).json({
    message: "Transaksi tidak ditemukan",
  });
  return;
}

if (
  transaksi.status_transaksi === "dibatalkan" ||
  transaksi.status_transaksi === "selesai"
) {
  res.status(400).json({
    message: "Transaksi yang selesai atau dibatalkan tidak bisa diubah",
  });
  return;
}
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE tb_transaksi
       SET status_transaksi = ?
       WHERE id_transaksi = ?`,
      [status_transaksi, id]
    );

    res.json({ message: "Status transaksi berhasil diperbarui" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal memperbarui transaksi" });
  }
});

// DELETE transaksi
router.delete("/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ message: "ID transaksi tidak valid" });
      return;
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT status_transaksi
       FROM tb_transaksi
       WHERE id_transaksi = ?
       FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: "Transaksi tidak ditemukan" });
      return;
    }

   const transaksi = rows[0];

if (!transaksi) {
  await connection.rollback();
  res.status(404).json({
    message: "Transaksi tidak ditemukan",
  });
  return;
}

if (transaksi.status_transaksi !== "pending") {
  await connection.rollback();
  res.status(400).json({
    message: "Hanya transaksi pending yang bisa dihapus",
  });
  return;
}

    const [details] = await connection.execute<RowDataPacket[]>(
      `SELECT id_varian, qty
       FROM tb_detail_transaksi
       WHERE id_transaksi = ? AND id_varian IS NOT NULL`,
      [id]
    );

    for (const detail of details) {
      await connection.execute(
        `UPDATE tb_varian_produk
         SET stok = stok + ?
         WHERE id_varian = ?`,
        [detail.qty, detail.id_varian]
      );
    }

    await connection.execute(
      "DELETE FROM tb_transaksi WHERE id_transaksi = ?",
      [id]
    );

    await connection.commit();

    res.json({
      message: "Transaksi pending berhasil dihapus dan stok dikembalikan",
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Gagal menghapus transaksi" });
  } finally {
    connection.release();
  }
});

export default router;
