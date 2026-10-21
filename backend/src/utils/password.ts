import crypto from "crypto";
import bcrypt from "bcryptjs";
import { BYTES_CODIGO_RECUPERACION, RONDAS_BCRYPT } from "../constants/autenticacion";

export function encriptarPassword(password: string) {
  return bcrypt.hash(password, RONDAS_BCRYPT);
}

export function compararPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generarCodigoRecuperacion() {
  return crypto.randomBytes(BYTES_CODIGO_RECUPERACION).toString("hex");
}

export function hashearCodigo(codigo: string) {
  return crypto.createHash("sha256").update(codigo).digest("hex");
}
