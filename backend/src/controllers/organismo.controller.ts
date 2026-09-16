import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import * as organismoService from "../services/organismo.service";

const NOMBRE_VALIDO = /^[\p{L}\p{N} .,-]+$/u;

export async function listar(req: Request, res: Response) {
  const soloActivos = req.query.activo === "true";
  const organismos = await organismoService.listarOrganismos({ soloActivos });
  res.json(organismos);
}

export async function obtener(req: Request, res: Response) {
  const organismo = await organismoService.obtenerOrganismo(req.params.id as string);
  if (!organismo) {
    res.status(404).json({ message: "Organismo no encontrado" });
    return;
  }
  res.json(organismo);
}

export async function crear(req: Request, res: Response) {
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    res.status(400).json({ message: "El campo 'nombre' es requerido" });
    return;
  }
  if (!NOMBRE_VALIDO.test(nombre)) {
    res.status(400).json({
      message: "El nombre solo puede tener letras, numeros, espacios, puntos, comas y guiones",
    });
    return;
  }
  const organismo = await organismoService.crearOrganismo({ nombre, descripcion });
  res.status(201).json(organismo);
}

export async function actualizar(req: Request, res: Response) {
  const { nombre, descripcion } = req.body;
  if (nombre && !NOMBRE_VALIDO.test(nombre)) {
    res.status(400).json({
      message: "El nombre solo puede tener letras, numeros, espacios, puntos, comas y guiones",
    });
    return;
  }

  try {
    const organismo = await organismoService.actualizarOrganismo(req.params.id as string, {
      nombre,
      descripcion,
    });
    res.json(organismo);
  } catch (error) {
    res.status(404).json({ message: "Organismo no encontrado" });
  }
}

export async function desactivar(req: Request, res: Response) {
  try {
    const organismo = await organismoService.desactivarOrganismo(req.params.id as string);
    res.json(organismo);
  } catch (error) {
    res.status(404).json({ message: "Organismo no encontrado" });
  }
}

export async function activar(req: Request, res: Response) {
  try {
    const organismo = await organismoService.activarOrganismo(req.params.id as string);
    res.json(organismo);
  } catch (error) {
    res.status(404).json({ message: "Organismo no encontrado" });
  }
}

export async function eliminar(req: Request, res: Response) {
  try {
    await organismoService.eliminarOrganismo(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Organismo no encontrado" });
        return;
      }
      if (error.code === "P2003") {
        res.status(409).json({
          message:
            "No se puede eliminar: el organismo tiene publicaciones asociadas. Desactívalo en su lugar.",
        });
        return;
      }
    }
    res.status(500).json({ message: "Error al eliminar el organismo" });
  }
}
