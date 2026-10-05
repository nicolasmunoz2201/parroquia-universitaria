import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import * as publicacionService from "../services/publicacion.service";
import * as organismoService from "../services/organismo.service";
import { eliminarArchivos } from "../middlewares/upload.middleware";

function puedeGestionarOrganismo(usuario: Request["usuario"], organismoId: string) {
  return usuario?.rol === "ADMINISTRADOR" || usuario?.organismoId === organismoId;
}

function eliminarImagenesGuardadas(imagenes: string[]) {
  for (const imagenUrl of imagenes) {
    fs.unlink(path.join(__dirname, "../..", imagenUrl), () => {});
  }
}

export async function listar(req: Request, res: Response) {
  const soloOrganismosActivos = req.query.activos === "true";
  const publicaciones = await publicacionService.listarPublicaciones({ soloOrganismosActivos });
  res.json(publicaciones);
}

export async function crear(req: Request, res: Response) {
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  const { titulo, contenido, organismoId } = req.body;
  if (!titulo || !contenido || typeof organismoId !== "string" || !organismoId) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: "titulo, contenido y organismoId son requeridos" });
    return;
  }

  if (!puedeGestionarOrganismo(req.usuario, organismoId)) {
    eliminarArchivos(archivos);
    res.status(403).json({ message: "Solo puedes publicar para tu propio organismo" });
    return;
  }

  const organismo = await organismoService.obtenerOrganismo(organismoId);
  if (!organismo) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: "El organismo seleccionado no existe" });
    return;
  }
  if (!organismo.activo) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: "No se puede publicar en un organismo desactivado" });
    return;
  }

  const imagenes = archivos.map((archivo) => `/uploads/${archivo.filename}`);

  try {
    const publicacion = await publicacionService.crearPublicacion({
      titulo,
      contenido,
      imagenes,
      autorId: req.usuario!.id,
      organismoId,
    });
    res.status(201).json(publicacion);
  } catch (error) {
    eliminarArchivos(archivos);
    throw error;
  }
}

export async function actualizar(req: Request, res: Response) {
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  const existente = await publicacionService.obtenerPublicacion(req.params.id as string);
  if (!existente) {
    eliminarArchivos(archivos);
    res.status(404).json({ message: "Publicacion no encontrada" });
    return;
  }

  if (!puedeGestionarOrganismo(req.usuario, existente.organismo.id)) {
    eliminarArchivos(archivos);
    res.status(403).json({ message: "Solo puedes editar publicaciones de tu propio organismo" });
    return;
  }

  const { titulo, contenido } = req.body;
  try {
    const publicacion = await publicacionService.actualizarPublicacion(req.params.id as string, {
      ...(titulo ? { titulo } : {}),
      ...(contenido ? { contenido } : {}),
      ...(archivos.length > 0
        ? { imagenes: archivos.map((archivo) => `/uploads/${archivo.filename}`) }
        : {}),
    });

    if (archivos.length > 0) {
      eliminarImagenesGuardadas(existente.imagenes);
    }

    res.json(publicacion);
  } catch (error) {
    eliminarArchivos(archivos);
    throw error;
  }
}

export async function eliminar(req: Request, res: Response) {
  const publicacion = await publicacionService.obtenerPublicacion(req.params.id as string);
  if (!publicacion) {
    res.status(404).json({ message: "Publicacion no encontrada" });
    return;
  }

  if (!puedeGestionarOrganismo(req.usuario, publicacion.organismo.id)) {
    res.status(403).json({ message: "Solo puedes eliminar publicaciones de tu propio organismo" });
    return;
  }

  await publicacionService.eliminarPublicacion(req.params.id as string);
  eliminarImagenesGuardadas(publicacion.imagenes);

  res.status(204).send();
}
