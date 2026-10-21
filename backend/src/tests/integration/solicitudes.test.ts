import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";

vi.mock("../../utils/correo", () => ({
  correoConfigurado: () => false,
  enviarCorreoEstadoSolicitud: vi.fn(),
  enviarCorreoRecuperacion: vi.fn(),
}));

const SUFIJO = Date.now();
const EMAILS = [`ana-${SUFIJO}@prueba.cl`, `bruno-${SUFIJO}@prueba.cl`, `carla-${SUFIJO}@prueba.cl`];
let horarioId = "";
let tokenAna = "";
let tokenBruno = "";
let tokenCarla = "";

async function crearFeligresConSesion(email: string) {
  await crearUsuario({ nombre: "Feligrés Prueba", email, password: "clave123", rol: "FELIGRES", organismoId: null });
  const response = await request(app).post("/api/auth/login").send({ email, password: "clave123" });
  return response.body.token as string;
}

function reservar(token: string, nombreBeneficiario: string) {
  return request(app)
    .post("/api/sacramentos/solicitudes")
    .set("Authorization", `Bearer ${token}`)
    .send({ horarioId, nombreBeneficiario });
}

describe("POST /api/sacramentos/solicitudes - Prueba de Integración", () => {
  beforeAll(async () => {
    [tokenAna, tokenBruno, tokenCarla] = await Promise.all(EMAILS.map(crearFeligresConSesion)) as [string, string, string];
    const horario = await prisma.horarioSacramento.create({
      data: { tipo: "UNCION_ENFERMOS", inicio: new Date(Date.now() + 24 * 60 * 60 * 1000), cupos: 2 },
    });
    horarioId = horario.id;
  });

  afterAll(async () => {
    await prisma.solicitudSacramento.deleteMany({ where: { horarioId } });
    await prisma.horarioSacramento.deleteMany({ where: { id: horarioId } });
    await prisma.usuario.deleteMany({ where: { email: { in: EMAILS } } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 400 si falta el nombre de quien recibe el sacramento", async () => {
    const response = await reservar(tokenAna, "");

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "Indica el nombre de quien recibira el sacramento");
  });

  it("debe crear la reserva con status 201 y dejarla en estado PENDIENTE", async () => {
    const response = await reservar(tokenAna, "María González");

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({ estado: "PENDIENTE", nombreBeneficiario: "María González" });
  });

  it("debe rechazar con status 409 una segunda reserva de la misma persona en el mismo horario", async () => {
    const response = await reservar(tokenAna, "Otro familiar");

    expect(response.statusCode).toBe(409);
    expect(response.body).toHaveProperty("message", "Ya tienes una solicitud en este horario");
  });

  it("debe permitir que otra persona tome el último cupo", async () => {
    const response = await reservar(tokenBruno, "Pedro Pérez");

    expect(response.statusCode).toBe(201);
  });

  it("debe rechazar con status 409 si el horario ya no tiene cupos", async () => {
    const response = await reservar(tokenCarla, "Rosa Soto");

    expect(response.statusCode).toBe(409);
    expect(response.body).toHaveProperty("message", "El horario ya no tiene cupos disponibles");
  });
});
