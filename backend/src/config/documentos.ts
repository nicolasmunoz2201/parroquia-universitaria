import fs from "fs";
import path from "path";

export const DIRECTORIO_DOCUMENTOS = path.resolve(
  process.env.DOCUMENTOS_DIR || path.join(__dirname, "../../documentos")
);

fs.mkdirSync(DIRECTORIO_DOCUMENTOS, { recursive: true });

export function rutaDocumento(archivo: string) {
  return path.join(DIRECTORIO_DOCUMENTOS, path.basename(archivo));
}

export function eliminarDocumentosGuardados(archivos: string[]) {
  for (const archivo of archivos) {
    fs.unlink(rutaDocumento(archivo), () => {});
  }
}
