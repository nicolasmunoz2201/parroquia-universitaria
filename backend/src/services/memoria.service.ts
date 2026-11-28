import prisma from "../config/prisma";

const INCLUIR_HITO = {
  fotos: { select: { id: true, url: true }, orderBy: { id: "asc" } },
  testimonios: { orderBy: { createdAt: "asc" } },
  autor: { select: { id: true, nombre: true } },
} as const;

interface DatosHito {
  titulo: string;
  descripcion: string;
  fecha: Date;
}

export function listarHitos() {
  return prisma.hitoHistorico.findMany({
    include: INCLUIR_HITO,
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
}

export function obtenerHito(id: string) {
  return prisma.hitoHistorico.findUnique({ where: { id }, include: INCLUIR_HITO });
}

export function crearHito(datos: DatosHito & { autorId: string; fotos: string[] }) {
  const { fotos, ...hito } = datos;
  return prisma.hitoHistorico.create({
    data: { ...hito, fotos: { create: fotos.map((url) => ({ url })) } },
    include: INCLUIR_HITO,
  });
}

export function actualizarHito(
  id: string,
  datos: DatosHito,
  fotos: { idsQuitar: string[]; urlsNuevas: string[] }
) {
  return prisma.$transaction(async (tx) => {
    if (fotos.idsQuitar.length > 0) {
      await tx.fotoHito.deleteMany({ where: { hitoId: id, id: { in: fotos.idsQuitar } } });
    }
    if (fotos.urlsNuevas.length > 0) {
      await tx.fotoHito.createMany({ data: fotos.urlsNuevas.map((url) => ({ url, hitoId: id })) });
    }
    return tx.hitoHistorico.update({ where: { id }, data: datos, include: INCLUIR_HITO });
  });
}

export function eliminarHito(id: string) {
  return prisma.hitoHistorico.delete({ where: { id } });
}

export function crearTestimonio(hitoId: string, datos: { autorNombre: string; contenido: string }) {
  return prisma.testimonio.create({ data: { ...datos, hitoId } });
}

export function obtenerTestimonio(id: string) {
  return prisma.testimonio.findUnique({ where: { id } });
}

export function eliminarTestimonio(id: string) {
  return prisma.testimonio.delete({ where: { id } });
}
