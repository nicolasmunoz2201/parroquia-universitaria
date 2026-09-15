import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
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

export async function me(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}
