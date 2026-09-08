import prisma from "../config/prisma";

export function listarOrganismos() {
  return prisma.organismo.findMany({
    orderBy: { nombre: "asc" },
  });
}

export function obtenerOrganismo(id: string) {
  return prisma.organismo.findUnique({ where: { id } });
}

export function crearOrganismo(data: { nombre: string; descripcion?: string }) {
  return prisma.organismo.create({ data });
}

export function actualizarOrganismo(
  id: string,
  data: { nombre?: string; descripcion?: string }
) {
  return prisma.organismo.update({ where: { id }, data });
}

export function desactivarOrganismo(id: string) {
  return prisma.organismo.update({ where: { id }, data: { activo: false } });
}

export function activarOrganismo(id: string) {
  return prisma.organismo.update({ where: { id }, data: { activo: true } });
}

export function eliminarOrganismo(id: string) {
  return prisma.organismo.delete({ where: { id } });
}
