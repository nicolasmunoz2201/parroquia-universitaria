import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import * as authService from "../services/auth.service";
import * as usuarioService from "../services/usuario.service";
import { leerEmail, leerTexto, validarDatosCuenta, validarPassword } from "../utils/validaciones";

export async function login(req: Request, res: Response) {
  const email = leerEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== "string" || !password) {
    res.status(400).json({ message: "Email y password son requeridos" });
    return;
  }

  const resultado = await authService.login(email, password);
  if (!resultado) {
    res.status(401).json({ message: "Credenciales invalidas" });
    return;
  }

  res.json(resultado);
}

export async function registro(req: Request, res: Response) {
  const nombre = leerTexto(req.body?.nombre);
  const email = leerEmail(req.body?.email);
  const password = req.body?.password;

  const error = validarDatosCuenta(nombre, email, password);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  try {
    const resultado = await authService.registrar(nombre!, email!, password);
    res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "Ya existe una cuenta con ese correo" });
      return;
    }
    throw error;
  }
}

export async function cambiarPassword(req: Request, res: Response) {
  const passwordActual = req.body?.passwordActual;
  const passwordNueva = req.body?.passwordNueva;

  if (typeof passwordActual !== "string" || !passwordActual) {
    res.status(400).json({ message: "Ingresa tu contraseña actual" });
    return;
  }
  const error = validarPassword(passwordNueva);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  if (passwordNueva === passwordActual) {
    res.status(400).json({ message: "La nueva contraseña debe ser distinta a la actual" });
    return;
  }

  const resultado = await authService.cambiarPasswordPropia(
    req.usuario!.id,
    passwordActual,
    passwordNueva
  );
  if (!resultado) {
    res.status(400).json({ message: "La contraseña actual no es correcta" });
    return;
  }

  res.json(resultado);
}

export async function restablecerPassword(req: Request, res: Response) {
  const codigo = req.body?.codigo;
  const password = req.body?.password;

  if (typeof codigo !== "string" || !codigo) {
    res.status(400).json({ message: "El enlace de recuperacion no es valido" });
    return;
  }
  const error = validarPassword(password);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const restablecida = await usuarioService.restablecerPassword(codigo, password);
  if (!restablecida) {
    res.status(400).json({
      message: "El enlace no es valido o ya vencio. Pide al administrador un correo nuevo.",
    });
    return;
  }
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const usuario = await authService.obtenerSesionActual(req.usuario!.id);
  res.json({ usuario });
}
