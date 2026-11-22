import { Request, Response } from "express";
import * as memoriaService from "../services/memoria.service";
import { leerTexto } from "../utils/validaciones";
import { leerFechaHito, separarFotos } from "../utils/memoria";
import { eliminarArchivos, eliminarFotosGuardadas, urlDeFoto } from "../middlewares/upload.middleware";
import { MAX_FOTOS_POR_HITO } from "../constants/archivos";
import {
  LARGO_MAXIMO_AUTOR_TESTIMONIO,
  LARGO_MAXIMO_DESCRIPCION_HITO,
  LARGO_MAXIMO_TESTIMONIO,
  LARGO_MAXIMO_TITULO_HITO,
} from "../constants/memoria";

function archivosDe(req: Request) {
  return (req.files as Express.Multer.File[] | undefined) ?? [];
}

function leerDatosHito(body: Request["body"]) {
  const titulo = leerTexto(body?.titulo);
  const descripcion = leerTexto(body?.descripcion);

  if (!titulo) return { error: "Escribe el título del hito" };
  if (titulo.length > LARGO_MAXIMO_TITULO_HITO) return { error: "El título es demasiado largo" };
  if (!descripcion) return { error: "Escribe la descripción del hito" };
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION_HITO) return { error: "La descripción es demasiado larga" };

  const resultadoFecha = leerFechaHito(body?.fecha);
  if ("error" in resultadoFecha) return { error: resultadoFecha.error };

  return { datos: { titulo, descripcion, fecha: resultadoFecha.fecha } };
}

export async function listar(_req: Request, res: Response) {
  res.json(await memoriaService.listarHitos());
}

export async function crear(req: Request, res: Response) {
  const archivos = archivosDe(req);
  const { datos, error } = leerDatosHito(req.body);
  if (!datos) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: error });
    return;
  }

  try {
    const hito = await memoriaService.crearHito({
      ...datos,
      autorId: req.usuario!.id,
      fotos: archivos.map(urlDeFoto),
    });
    res.status(201).json(hito);
  } catch (err) {
    eliminarArchivos(archivos);
    throw err;
  }
}

export async function actualizar(req: Request, res: Response) {
  const archivos = archivosDe(req);
  const existente = await memoriaService.obtenerHito(req.params.id as string);
  if (!existente) {
    eliminarArchivos(archivos);
    res.status(404).json({ message: "Hito no encontrado" });
    return;
  }

  const { datos, error } = leerDatosHito(req.body);
  if (!datos) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: error });
    return;
  }

  const separacion = separarFotos(
    existente.fotos.map((foto) => foto.id),
    req.body?.fotosConservar
  );
  if ("error" in separacion) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: separacion.error });
    return;
  }
  if (separacion.idsConservar.length + archivos.length > MAX_FOTOS_POR_HITO) {
    eliminarArchivos(archivos);
    res.status(400).json({ message: `Un hito puede tener hasta ${MAX_FOTOS_POR_HITO} fotos` });
    return;
  }

  try {
    const hito = await memoriaService.actualizarHito(existente.id, datos, {
      idsQuitar: separacion.idsQuitar,
      urlsNuevas: archivos.map(urlDeFoto),
    });
    eliminarFotosGuardadas(
      existente.fotos.filter((foto) => separacion.idsQuitar.includes(foto.id)).map((foto) => foto.url)
    );
    res.json(hito);
  } catch (err) {
    eliminarArchivos(archivos);
    throw err;
  }
}

export async function eliminar(req: Request, res: Response) {
  const hito = await memoriaService.obtenerHito(req.params.id as string);
  if (!hito) {
    res.status(404).json({ message: "Hito no encontrado" });
    return;
  }

  await memoriaService.eliminarHito(hito.id);
  eliminarFotosGuardadas(hito.fotos.map((foto) => foto.url));
  res.status(204).send();
}

export async function agregarTestimonio(req: Request, res: Response) {
  const hito = await memoriaService.obtenerHito(req.params.id as string);
  if (!hito) {
    res.status(404).json({ message: "Hito no encontrado" });
    return;
  }

  const autorNombre = leerTexto(req.body?.autorNombre);
  const contenido = leerTexto(req.body?.contenido);
  if (!autorNombre) {
    res.status(400).json({ message: "Escribe el nombre de quien da el testimonio" });
    return;
  }
  if (autorNombre.length > LARGO_MAXIMO_AUTOR_TESTIMONIO) {
    res.status(400).json({ message: "El nombre es demasiado largo" });
    return;
  }
  if (!contenido) {
    res.status(400).json({ message: "Escribe el testimonio" });
    return;
  }
  if (contenido.length > LARGO_MAXIMO_TESTIMONIO) {
    res.status(400).json({ message: "El testimonio es demasiado largo" });
    return;
  }

  res.status(201).json(await memoriaService.crearTestimonio(hito.id, { autorNombre, contenido }));
}

export async function eliminarTestimonio(req: Request, res: Response) {
  const testimonio = await memoriaService.obtenerTestimonio(req.params.id as string);
  if (!testimonio) {
    res.status(404).json({ message: "Testimonio no encontrado" });
    return;
  }

  await memoriaService.eliminarTestimonio(testimonio.id);
  res.status(204).send();
}
