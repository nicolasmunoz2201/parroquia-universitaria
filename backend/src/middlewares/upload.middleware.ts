import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

export class ArchivoInvalidoError extends Error {}

function filtroImagen(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new ArchivoInvalidoError("El archivo debe ser una imagen"));
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


