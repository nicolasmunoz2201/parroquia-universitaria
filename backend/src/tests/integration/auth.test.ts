import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";

describe("POST /api/auth/login - Prueba de Integración", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("debe rechazar la solicitud con status 400 si falta la contraseña", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "usuario@ejemplo.com" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "Email y password son requeridos");
  });

  it("debe rechazar con status 401 si la contraseña es incorrecta", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: process.env.ADMIN_EMAIL, password: "ClaveIncorrecta" });

    expect(response.statusCode).toBe(401);
  });

  it("debe entregar un token al administrador con sus credenciales correctas", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.usuario).toHaveProperty("rol", "ADMINISTRADOR");
  });
});
