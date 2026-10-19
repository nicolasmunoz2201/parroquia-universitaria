import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import { DIRECTORIO_DOCUMENTOS } from "../config/documentos";
import {
  BYTES_POR_MB,
  MAX_DOCUMENTOS_POR_SOLICITUD,
  MAX_TAMANO_DOCUMENTO_MB,
} from "../constants/archivos";
import { ArchivoInvalidoError, eliminarArchivos } from "./upload.middleware";

const FIRMA_PDF = "%PDF-";

const almacenamiento = multer.diskStorage({
  destination: DIRECTORIO_DOCUMENTOS,
  filename: (_req, _file, cb) => {
    cb(null, `${crypto.randomUUID()}.pdf`);
  },
});

const uploadDocumentos = multer({
  storage: almacenamiento,
  defParamCharset: "utf8",
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new ArchivoInvalidoError("Los documentos deben ser archivos PDF"));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_TAMANO_DOCUMENTO_MB * BYTES_POR_MB,
    files: MAX_DOCUMENTOS_POR_SOLICITUD,
  },
});

function mensajeDeMulter(error: multer.MulterError) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return `Cada documento puede pesar hasta ${MAX_TAMANO_DOCUMENTO_MB} MB`;
  }
  if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
    return `Puedes subir hasta ${MAX_DOCUMENTOS_POR_SOLICITUD} documentos`;
  }
  return "No se pudieron subir los documentos";
}

export function subirDocumentos(req: Request, res: Response, next: NextFunction) {
  uploadDocumentos.array("documentos", MAX_DOCUMENTOS_POR_SOLICITUD)(req, res, (err: unknown) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) {
        eliminarArchivos((req.files as Express.Multer.File[] | undefined) ?? []);
      }
    });
    if (err instanceof multer.MulterError) {
      next(new ArchivoInvalidoError(mensajeDeMulter(err)));
      return;
    }
    next(err);
  });
}

async function esPdfReal(ruta: string) {
  const descriptor = await fs.promises.open(ruta, "r");
  try {
    const inicio = Buffer.alloc(FIRMA_PDF.length);
    await descriptor.read(inicio, 0, inicio.length, 0);
    return inicio.toString("latin1") === FIRMA_PDF;
  } finally {
    await descriptor.close();
  }
}

export async function verificarDocumentos(req: Request, _res: Response, next: NextFunction) {
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  for (const archivo of archivos) {
    if (!(await esPdfReal(archivo.path))) {
      next(new ArchivoInvalidoError(`"${archivo.originalname}" no es un PDF valido`));
      return;
    }
  }
  next();
}
