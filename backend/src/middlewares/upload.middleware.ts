import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

function empiezaCon(inicio: Buffer, bytes: number[]) {
  return bytes.every((byte, i) => inicio[i] === byte);
}

const TIPOS_DE_IMAGEN: Record<string, { extension: string; esValida: (inicio: Buffer) => boolean }> = {
  "image/jpeg": {
    extension: ".jpg",
    esValida: (inicio) => empiezaCon(inicio, [0xff, 0xd8, 0xff]),
  },
  "image/png": {
    extension: ".png",
    esValida: (inicio) => empiezaCon(inicio, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  "image/webp": {
    extension: ".webp",
    esValida: (inicio) =>
      inicio.toString("latin1", 0, 4) === "RIFF" && inicio.toString("latin1", 8, 12) === "WEBP",
  },
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const extension = TIPOS_DE_IMAGEN[file.mimetype]?.extension ?? "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

export class ArchivoInvalidoError extends Error {}

function filtroImagen(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!TIPOS_DE_IMAGEN[file.mimetype]) {
    cb(new ArchivoInvalidoError("Solo se permiten fotos JPG, PNG o WEBP"));
    return;
  }
  cb(null, true);
}

export const MAX_TAMANO_FOTO_MB = 5;

export const uploadImagen = multer({
  storage,
  fileFilter: filtroImagen,
  limits: { fileSize: MAX_TAMANO_FOTO_MB * 1024 * 1024 },
});

export function eliminarArchivos(archivos: Express.Multer.File[]) {
  for (const archivo of archivos) {
    fs.unlink(archivo.path, () => {});
  }
}

async function esImagenReal(archivo: Express.Multer.File) {
  const tipo = TIPOS_DE_IMAGEN[archivo.mimetype];
  if (!tipo) return false;

  const descriptor = await fs.promises.open(archivo.path, "r");
  try {
    const inicio = Buffer.alloc(12);
    await descriptor.read(inicio, 0, inicio.length, 0);
    return tipo.esValida(inicio);
  } finally {
    await descriptor.close();
  }
}

export async function verificarImagenes(req: Request, _res: Response, next: NextFunction) {
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  for (const archivo of archivos) {
    if (!(await esImagenReal(archivo))) {
      eliminarArchivos(archivos);
      next(new ArchivoInvalidoError(`"${archivo.originalname}" no es una imagen valida`));
      return;
    }
  }
  next();
}
