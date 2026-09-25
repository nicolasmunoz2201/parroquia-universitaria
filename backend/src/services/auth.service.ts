import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { Rol } from "../generated/prisma/client";
import * as usuarioService from "./usuario.service";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface DatosSesion {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  organismoId: string | null;
  organismo: { id: string; nombre: string } | null;
}

function datosPublicos(usuario: DatosSesion) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    organismoId: usuario.organismoId,
    organismo: usuario.organismo,
  };
}

function crearSesion(usuario: DatosSesion, tokenVersion: number) {
  const token = jwt.sign({ id: usuario.id, v: tokenVersion }, JWT_SECRET, { expiresIn: "8h" });
  return { token, usuario: datosPublicos(usuario) };
}

export async function login(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { organismo: { select: { id: true, nombre: true } } },
  });
  if (!usuario) {
    return null;
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);
  if (!passwordValida) {
    return null;
  }

  return crearSesion(usuario, usuario.tokenVersion);
}

export async function registrar(nombre: string, email: string, password: string) {
  const usuario = await usuarioService.crearUsuario({
    nombre,
    email,
    password,
    rol: Rol.FELIGRES,
    organismoId: null,
  });
  return crearSesion(usuario, 0);
}

export async function obtenerSesionActual(id: string) {
  const usuario = await usuarioService.obtenerUsuario(id);
  return usuario ? datosPublicos(usuario) : null;
}
