import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import type { Rol } from "../generated/prisma/client";

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
  await prisma.usuario.update({
    where: { id },
    data: { password: passwordHasheada, tokenVersion: { increment: 1 } },
  });
}
