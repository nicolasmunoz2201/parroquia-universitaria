import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import * as authService from "../services/auth.service";
import { leerEmail, leerTexto, validarDatosCuenta } from "../utils/validaciones";

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

export async function me(req: Request, res: Response) {
  const usuario = await authService.obtenerSesionActual(req.usuario!.id);
  res.json({ usuario });
}
