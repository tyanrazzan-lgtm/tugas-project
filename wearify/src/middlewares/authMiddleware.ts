
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    adminId?: number;
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Token tidak ditemukan",
        });
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            message: "Konfigurasi server belum lengkap",
        });
    }

    try {
        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === "string" ||
            typeof decoded.id_admin !== "number"
        ) {
            return res.status(401).json({
                message: "Token tidak valid",
            });
        }

        req.adminId = decoded.id_admin;
        next();
    } catch {
        return res.status(401).json({
            message: "Token tidak valid atau kedaluwarsa",
        });
    }
}
