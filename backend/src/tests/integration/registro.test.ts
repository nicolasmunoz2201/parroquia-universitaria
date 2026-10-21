import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";

const EMAIL_PRUEBA = `registro-${Date.now()}@prueba.cl`;

describe("POST /api/auth/registro - Prueba de Integración", () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL_PRUEBA } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 400 un correo sin formato válido", async () => {
    const response = await request(app)
      .post("/api/auth/registro")
      .send({ nombre: "Usuario Prueba", email: "correo-sin-arroba", password: "clave123" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "El correo no tiene un formato valido");
  });

  it("debe crear la cuenta con status 201 y rol de feligrés", async () => {
    const response = await request(app)
      .post("/api/auth/registro")
      .send({ nombre: "Usuario Prueba", email: EMAIL_PRUEBA, password: "clave123" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body.usuario).toHaveProperty("rol", "FELIGRES");
  });

  it("debe rechazar con status 409 un correo que ya está registrado", async () => {
    const response = await request(app)
      .post("/api/auth/registro")
      .send({ nombre: "Otra Persona", email: EMAIL_PRUEBA, password: "clave123" });

    expect(response.statusCode).toBe(409);
    expect(response.body).toHaveProperty("message", "Ya existe una cuenta con ese correo");
  });
});
