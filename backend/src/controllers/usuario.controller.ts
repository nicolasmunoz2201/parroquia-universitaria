import { Request, Response } from "express";
import { Prisma, Rol } from "../generated/prisma/client";
import * as usuarioService from "../services/usuario.service";
import * as organismoService from "../services/organismo.service";
import { leerEmail, leerTexto, validarDatosCuenta, validarPassword } from "../utils/validaciones";

const ROLES_ASIGNABLES: Rol[] = Object.values(Rol).filter((rol) => rol !== Rol.ADMINISTRADOR);

async function validarRolYOrganismo(rol: unknown, organismoId: unknown): Promise<string | null> {
  if (typeof rol !== "string" || !ROLES_ASIGNABLES.includes(rol as Rol)) {
    return `El rol debe ser uno de: ${ROLES_ASIGNABLES.join(", ")}`;
  }
  if (rol !== Rol.ENCARGADO_ORGANISMO) {
    return null;
  }
  if (typeof organismoId !== "string" || !organismoId) {
    return "Debes seleccionar un organismo para un encargado de organismo";
  }
  const organismo = await organismoService.obtenerOrganismo(organismoId);
  if (!organismo) {
    return "El organismo seleccionado no existe";
  }
  if (!organismo.activo) {
    return "El organismo seleccionado esta desactivado";
  }
  return null;
}

async function obtenerUsuarioEditable(req: Request, res: Response) {
  const usuario = await usuarioService.obtenerUsuario(req.params.id as string);
  if (!usuario) {
    res.status(404).json({ message: "Usuario no encontrado" });
    return null;
  }
  if (usuario.rol === Rol.ADMINISTRADOR) {
    res.status(403).json({ message: "No se puede modificar a un administrador" });
    return null;
  }
  return usuario;
}

export async function listar(_req: Request, res: Response) {
  const usuarios = await usuarioService.listarUsuarios();
  res.json(usuarios);
}

export async function crear(req: Request, res: Response) {
  const nombre = leerTexto(req.body?.nombre);
  const email = leerEmail(req.body?.email);
  const { password, organismoId, rol } = req.body ?? {};

  const error = validarDatosCuenta(nombre, email, password) ?? (await validarRolYOrganismo(rol, organismoId));
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  try {
    const usuario = await usuarioService.crearUsuario({
      nombre: nombre!,
      email: email!,
      password,
      rol: rol as Rol,
      organismoId: rol === Rol.ENCARGADO_ORGANISMO ? organismoId : null,
    });
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "Ya existe un usuario con ese correo" });
      return;
    }
    throw error;
  }
}

export async function actualizarRol(req: Request, res: Response) {
  const { rol, organismoId } = req.body ?? {};

  const error = await validarRolYOrganismo(rol, organismoId);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const existente = await obtenerUsuarioEditable(req, res);
  if (!existente) return;

  const usuario = await usuarioService.actualizarRolUsuario(existente.id, {
    rol: rol as Rol,
    organismoId: rol === Rol.ENCARGADO_ORGANISMO ? organismoId : null,
  });
  res.json(usuario);
}

export async function cambiarPassword(req: Request, res: Response) {
  const password = req.body?.password;
  const error = validarPassword(password);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const existente = await obtenerUsuarioEditable(req, res);
  if (!existente) return;

  await usuarioService.cambiarPassword(existente.id, password);
  res.status(204).send();
}
