import { Request, Response } from "express";
import { checkDatabaseConnection } from "../services/health.service";

export async function getHealth(req: Request, res: Response) {
  try {
    const db = await checkDatabaseConnection();
    res.json({ status: "ok", ...db });
  } catch (error) {
    res.status(500).json({ status: "error", message: "No se pudo conectar a la base de datos" });
  }
}
