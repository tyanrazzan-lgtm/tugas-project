import express from "express";
import cors from "cors";
import db from "./db/index.js";
import authRouter from "./routes/auth.js";
import { authMiddleware, type AuthRequest,} from "./middlewares/authMiddleware.js";
import kategoriRouter from "./routes/kategori.js";
import produkRouter from "./routes/produk.js";
import pelangganRouter from "./routes/pelanggan.js";
import varianRouter from "./routes/varian.js";
import transaksiRouter from "./routes/transaksi.js";

const app = express();

app.use(cors());
app.use(express.json());
  
// ROUTE AUTH
app.use("/api/auth", authRouter);

// ROUTE KATEGORI
app.use("/api/kategori", kategoriRouter);

app.use("/api/produk", produkRouter);

app.use("/api/pelanggan", pelangganRouter);

app.use("/api/varian", varianRouter);

app.use("/api/transaksi", transaksiRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to Wearify API",
  });
});

// TEST DATABASE
app.get("/api/test-db", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS hasil");

    res.json({
      message: "Koneksi database berhasil",
      data: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Koneksi database gagal",
    });
  }
});

app.get(
    "/api/admin/profile",
    authMiddleware,
    (req, res) => {
        const adminReq = req as AuthRequest;

        return res.status(200).json({
            message: "Token valid",
            adminId: adminReq.adminId,
        });
    }
);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Wearify API berjalan di http://localhost:${PORT}`);
});
