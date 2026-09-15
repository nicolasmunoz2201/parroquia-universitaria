import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ message: "Recurso no encontrado" });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({ message: "No se puede completar la operacion: hay datos relacionados" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
}
