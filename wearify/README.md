# Wearify Backend

## Setup
1. Install Node.js LTS.
2. Copy `.env.example` to `.env`.
3. Fill in the actual Aiven credentials in `.env`.
4. Use the Aiven host and port shown in the Aiven dashboard. The port in the current setup was `21667`; confirm it in Aiven.
5. Run `npm install`.
6. Run `npm run typecheck`.
7. Run `npm run dev`.
8. Test `http://localhost:3000/api/test-db`.

`DB_SSL=true` enables TLS for Aiven. The current convenience configuration disables certificate verification (`rejectUnauthorized: false`) to avoid local CA-path issues; for production, use Aiven's CA certificate and verify it.

Do not commit `.env` to Git. The uploaded archive contained credentials, so rotate the Aiven database password and JWT secret before using this project again.

## Routes
- `GET /api/produk` and `GET /api/kategori` are public for storefront loading.
- Create/update/delete operations and admin data routes require `Authorization: Bearer <token>`.
- Login: `POST /api/auth/login`
- Register admin: `POST /api/auth/register`
