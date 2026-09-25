import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  let payload: { id: string; v: number };
  try {
    payload = jwt.verify(header.slice("Bearer ".length), JWT_SECRET) as { id: string; v: number };
  } catch {
    res.status(401).json({ message: "Token invalido o expirado" });
    return;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: { id: true, rol: true, organismoId: true, tokenVersion: true },
  });
  if (!usuario || usuario.tokenVersion !== payload.v) {
    res.status(401).json({ message: "La sesion ya no es valida, inicia sesion de nuevo" });
    return;
  }

  req.usuario = { id: usuario.id, rol: usuario.rol, organismoId: usuario.organismoId };
  next();
}

export function requiereRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ message: "No tienes permisos para esta accion" });
      return;
    }
    next();
  };
}
