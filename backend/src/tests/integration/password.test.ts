import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";
import { enviarAvisoCambioPassword, enviarCorreoRecuperacion } from "../../utils/correo";

vi.mock("../../utils/correo", () => ({
  correoConfigurado: () => true,
  enviarCorreoRecuperacion: vi.fn().mockResolvedValue(undefined),
  enviarAvisoCambioPassword: vi.fn().mockResolvedValue(undefined),
}));

const SUFIJO = Date.now();
const EMAIL_FELIGRES = `feligres-password-${SUFIJO}@prueba.cl`;
const EMAIL_RECUPERA = `feligres-recupera-${SUFIJO}@prueba.cl`;
let token = "";

describe("Contraseña por cuenta propia - Prueba de Integración", () => {
  beforeAll(async () => {
    await crearUsuario({ nombre: "Feligrés Prueba", email: EMAIL_FELIGRES, password: "clave123", rol: "FELIGRES", organismoId: null });
    await crearUsuario({ nombre: "Feligrés Recupera", email: EMAIL_RECUPERA, password: "clave123", rol: "FELIGRES", organismoId: null });
    const sesion = await request(app).post("/api/auth/login").send({ email: EMAIL_FELIGRES, password: "clave123" });
    token = sesion.body.token;
  });

  beforeEach(() => {
    vi.mocked(enviarCorreoRecuperacion).mockClear();
    vi.mocked(enviarAvisoCambioPassword).mockClear();
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { in: [EMAIL_FELIGRES, EMAIL_RECUPERA] } } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 400 si la contraseña actual no es correcta", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ passwordActual: "incorrecta", passwordNueva: "nueva123" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "La contraseña actual no es correcta");
    expect(enviarAvisoCambioPassword).not.toHaveBeenCalled();
  });

  it("debe permitir que un feligrés cambie su propia contraseña y avisarle por correo", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ passwordActual: "clave123", passwordNueva: "nueva123" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(enviarAvisoCambioPassword).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enviarAvisoCambioPassword).mock.calls[0]?.[0]).toHaveProperty("email", EMAIL_FELIGRES);

    const sesionNueva = await request(app).post("/api/auth/login").send({ email: EMAIL_FELIGRES, password: "nueva123" });
    expect(sesionNueva.statusCode).toBe(200);
  });

  it("debe rechazar con status 400 un correo sin formato válido al pedir recuperación", async () => {
    const response = await request(app).post("/api/auth/recuperar").send({ email: "correo-sin-arroba" });

    expect(response.statusCode).toBe(400);
    expect(enviarCorreoRecuperacion).not.toHaveBeenCalled();
  });

  it("debe enviar el enlace de recuperación cuando el usuario lo pide con su correo", async () => {
    const response = await request(app).post("/api/auth/recuperar").send({ email: EMAIL_RECUPERA.toUpperCase() });

    expect(response.statusCode).toBe(204);
    expect(enviarCorreoRecuperacion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enviarCorreoRecuperacion).mock.calls[0]?.[0]).toHaveProperty("email", EMAIL_RECUPERA);
  });

  it("debe responder igual a un correo no registrado, sin enviar nada", async () => {
    const response = await request(app).post("/api/auth/recuperar").send({ email: `no-existe-${SUFIJO}@prueba.cl` });

    expect(response.statusCode).toBe(204);
    expect(enviarCorreoRecuperacion).not.toHaveBeenCalled();
  });
});
