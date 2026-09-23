import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { Prisma } from "../generated/prisma/client";
import { ArchivoInvalidoError,MAX_TAMANO_FOTO_MB } from "./upload.middleware";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ArchivoInvalidoError) {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ message: "Puedes subir hasta 3 fotos por publicacion" });
      return;
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: `El tamaño del archivo excede el límite de ${MAX_TAMANO_FOTO_MB} MB` });
      return;
    }
    res.status(400).json({ message: "Error al subir el archivo" });
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
