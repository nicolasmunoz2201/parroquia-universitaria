import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import * as publicacionService from "../services/publicacion.service";

export async function listar(req: Request, res: Response) {
  const soloOrganismosActivos = req.query.activos === "true";
  const publicaciones = await publicacionService.listarPublicaciones({ soloOrganismosActivos });
  res.json(publicaciones);
}

export async function crear(req: Request, res: Response) {
  const { titulo, contenido, organismoId } = req.body;
  if (!titulo || !contenido || !organismoId) {
    res.status(400).json({ message: "titulo, contenido y organismoId son requeridos" });
    return;
  }

  if (req.usuario!.rol === "ENCARGADO_ORGANISMO" && req.usuario!.organismoId !== organismoId) {
    res.status(403).json({ message: "Solo puedes publicar para tu propio organismo" });
    return;
  }

  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  const imagenes = archivos.map((archivo) => `/uploads/${archivo.filename}`);

  const publicacion = await publicacionService.crearPublicacion({
    titulo,
    contenido,
    imagenes,
    autorId: req.usuario!.id,
    organismoId,
  });
  res.status(201).json(publicacion);
}

export async function actualizar(req: Request, res: Response) {
  const existente = await publicacionService.obtenerPublicacion(req.params.id as string);
  if (!existente) {
    res.status(404).json({ message: "Publicacion no encontrada" });
    return;
  }

  if (
    req.usuario!.rol === "ENCARGADO_ORGANISMO" &&
    req.usuario!.organismoId !== existente.organismo.id
  ) {
    res.status(403).json({ message: "Solo puedes editar publicaciones de tu propio organismo" });
    return;
  }

  const { titulo, contenido } = req.body;
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];

  const publicacion = await publicacionService.actualizarPublicacion(req.params.id as string, {
    ...(titulo ? { titulo } : {}),
    ...(contenido ? { contenido } : {}),
    ...(archivos.length > 0
      ? { imagenes: archivos.map((archivo) => `/uploads/${archivo.filename}`) }
      : {}),
  });

  if (archivos.length > 0) {
    for (const imagenUrl of existente.imagenes) {
      const rutaImagen = path.join(__dirname, "../..", imagenUrl);
      fs.unlink(rutaImagen, () => {});
    }
  }

  res.json(publicacion);
}

export async function eliminar(req: Request, res: Response) {
  const publicacion = await publicacionService.obtenerPublicacion(req.params.id as string);
  if (!publicacion) {
    res.status(404).json({ message: "Publicacion no encontrada" });
    return;
  }

  if (
    req.usuario!.rol === "ENCARGADO_ORGANISMO" &&
    req.usuario!.organismoId !== publicacion.organismo.id
  ) {
    res.status(403).json({ message: "Solo puedes eliminar publicaciones de tu propio organismo" });
    return;
  }

  await publicacionService.eliminarPublicacion(req.params.id as string);

  for (const imagenUrl of publicacion.imagenes) {
    const rutaImagen = path.join(__dirname, "../..", imagenUrl);
    fs.unlink(rutaImagen, () => {});
  }

  res.status(204).send();
}
