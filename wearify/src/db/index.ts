import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Environment variable ${name} belum diatur di file .env`);
  }
  return value;
}

const port = Number(process.env.DB_PORT ?? "3306");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT harus berupa angka port yang valid");
}

const db = mysql.createPool({
  host: requiredEnv("DB_HOST"),
  port,
  user: requiredEnv("DB_USER"),
  password: requiredEnv("DB_PASSWORD"),
  database: requiredEnv("DB_NAME"),
  connectTimeout: 20000,
  waitForConnections: true,
  connectionLimit: 10,
  ...(process.env.DB_SSL !== "false"
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

export default db;
