import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import type { Rol } from "../generated/prisma/client";
import { HORAS_VALIDEZ_RECUPERACION } from "../utils/correo";

// En la base solo se guarda el hash del codigo, asi quien lea la tabla no puede usar el enlace.
function hashearCodigo(codigo: string) {
  return crypto.createHash("sha256").update(codigo).digest("hex");
}

const SELECT_SEGURO = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  organismoId: true,
  organismo: { select: { id: true, nombre: true } },
  createdAt: true,
} as const;

export function listarUsuarios() {
  return prisma.usuario.findMany({
    select: SELECT_SEGURO,
    orderBy: { nombre: "asc" },
  });
}

export async function crearUsuario(data: {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  organismoId: string | null;
}) {
  const passwordHasheada = await bcrypt.hash(data.password, 10);
  return prisma.usuario.create({
    data: { ...data, password: passwordHasheada },
    select: SELECT_SEGURO,
  });
}

export function obtenerUsuario(id: string) {
  return prisma.usuario.findUnique({ where: { id }, select: SELECT_SEGURO });
}

export function actualizarRolUsuario(id: string, data: { rol: Rol; organismoId: string | null }) {
  return prisma.usuario.update({
    where: { id },
    data,
    select: SELECT_SEGURO,
  });
}

export async function cambiarPassword(id: string, password: string) {
  const passwordHasheada = await bcrypt.hash(password, 10);
  const { tokenVersion } = await prisma.usuario.update({
    where: { id },
    data: {
      password: passwordHasheada,
      tokenVersion: { increment: 1 },
      recuperacionHash: null,
      recuperacionExpira: null,
    },
    select: { tokenVersion: true },
  });
  return tokenVersion;
}

export async function crearCodigoRecuperacion(id: string) {
  const codigo = crypto.randomBytes(32).toString("hex");
  await prisma.usuario.update({
    where: { id },
    data: {
      recuperacionHash: hashearCodigo(codigo),
      recuperacionExpira: new Date(Date.now() + HORAS_VALIDEZ_RECUPERACION * 60 * 60 * 1000),
    },
  });
  return codigo;
}

export async function anularCodigoRecuperacion(id: string) {
  await prisma.usuario.update({
    where: { id },
    data: { recuperacionHash: null, recuperacionExpira: null },
  });
}

export async function restablecerPassword(codigo: string, password: string) {
  const recuperacionHash = hashearCodigo(codigo);
  const usuario = await prisma.usuario.findUnique({ where: { recuperacionHash } });
  if (!usuario?.recuperacionExpira || usuario.recuperacionExpira < new Date()) {
    return false;
  }

  const passwordHasheada = await bcrypt.hash(password, 10);
  // El where incluye el hash para que dos usos simultaneos del mismo enlace no pasen ambos.
  const { count } = await prisma.usuario.updateMany({
    where: { id: usuario.id, recuperacionHash },
    data: {
      password: passwordHasheada,
      tokenVersion: { increment: 1 },
      recuperacionHash: null,
      recuperacionExpira: null,
    },
  });
  return count === 1;
}
