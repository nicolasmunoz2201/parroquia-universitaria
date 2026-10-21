import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";

const EMAIL_FELIGRES = `feligres-horarios-${Date.now()}@prueba.cl`;
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const horariosCreados: string[] = [];
let tokenAdmin = "";
let tokenFeligres = "";

async function iniciarSesion(email: string | undefined, password: string | undefined) {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  return response.body.token as string;
}

describe("POST /api/sacramentos/horarios - Prueba de Integración", () => {
  beforeAll(async () => {
    await crearUsuario({
      nombre: "Feligrés Prueba",
      email: EMAIL_FELIGRES,
      password: "clave123",
      rol: "FELIGRES",
      organismoId: null,
    });
    tokenAdmin = await iniciarSesion(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    tokenFeligres = await iniciarSesion(EMAIL_FELIGRES, "clave123");
  });

  afterAll(async () => {
    await prisma.horarioSacramento.deleteMany({ where: { id: { in: horariosCreados } } });
    await prisma.usuario.deleteMany({ where: { email: EMAIL_FELIGRES } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 401 si no se inició sesión", async () => {
    const response = await request(app)
      .post("/api/sacramentos/horarios")
      .send({ tipo: "BAUTISMO", inicio: MANANA, cupos: 3 });

    expect(response.statusCode).toBe(401);
  });

  it("debe rechazar con status 403 si un feligrés intenta publicar un horario", async () => {
    const response = await request(app)
      .post("/api/sacramentos/horarios")
      .set("Authorization", `Bearer ${tokenFeligres}`)
      .send({ tipo: "BAUTISMO", inicio: MANANA, cupos: 3 });

    expect(response.statusCode).toBe(403);
  });

  it("debe rechazar con status 400 una fecha que ya pasó", async () => {
    const response = await request(app)
      .post("/api/sacramentos/horarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ tipo: "BAUTISMO", inicio: "2020-01-01T10:00:00.000Z", cupos: 3 });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "La fecha y hora deben ser futuras");
  });

  it("debe publicar el horario con status 201 cuando lo hace el administrador", async () => {
    const response = await request(app)
      .post("/api/sacramentos/horarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ tipo: "BAUTISMO", inicio: MANANA, cupos: 3, lugar: "Capilla Universitaria" });

    horariosCreados.push(response.body.id);
    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({ tipo: "BAUTISMO", cupos: 3, activo: true });
  });
});
