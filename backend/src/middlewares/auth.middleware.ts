import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; rol: string };
    req.usuario = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalido o expirado" });
  }
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
