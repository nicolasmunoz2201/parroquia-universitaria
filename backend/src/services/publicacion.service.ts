import prisma from "../config/prisma";

export function listarPublicaciones(opciones: { soloOrganismosActivos?: boolean } = {}) {
  return prisma.publicacion.findMany({
    ...(opciones.soloOrganismosActivos ? { where: { organismo: { activo: true } } } : {}),
    include: {
      organismo: { select: { id: true, nombre: true } },
      autor: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function obtenerPublicacion(id: string) {
  return prisma.publicacion.findUnique({
    where: { id },
    include: {
      organismo: { select: { id: true, nombre: true } },
      autor: { select: { id: true, nombre: true } },
    },
  });
}

export function crearPublicacion(data: {
  titulo: string;
  contenido: string;
  imagenes: string[];
  autorId: string;
  organismoId: string;
}) {
  return prisma.publicacion.create({
    data,
    include: {
      organismo: { select: { id: true, nombre: true } },
      autor: { select: { id: true, nombre: true } },
    },
  });
}

export function actualizarPublicacion(
  id: string,
  data: { titulo?: string; contenido?: string; imagenes?: string[] }
) {
  return prisma.publicacion.update({
    where: { id },
    data,
    include: {
      organismo: { select: { id: true, nombre: true } },
      autor: { select: { id: true, nombre: true } },
    },
  });
}

export function eliminarPublicacion(id: string) {
  return prisma.publicacion.delete({ where: { id } });
}
