import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";
import { enviarAvisoCancelacion, enviarCorreoEstadoSolicitud } from "../../utils/correo";

vi.mock("../../utils/correo", () => ({
  correoConfigurado: () => true,
  enviarCorreoEstadoSolicitud: vi.fn().mockResolvedValue(undefined),
  enviarAvisoCancelacion: vi.fn().mockResolvedValue(undefined),
  enviarCorreoRecuperacion: vi.fn(),
}));

const SUFIJO = Date.now();
const EMAIL_FELIGRES = `feligres-cancela-${SUFIJO}@prueba.cl`;
const EMAIL_SECRETARIA = `secretaria-cancela-${SUFIJO}@prueba.cl`;
let horarioId = "";
let token = "";

describe("PATCH /api/sacramentos/solicitudes/:id/cancelar - Prueba de Integración", () => {
  beforeAll(async () => {
    await crearUsuario({ nombre: "Feligrés Prueba", email: EMAIL_FELIGRES, password: "clave123", rol: "FELIGRES", organismoId: null });
    await crearUsuario({ nombre: "Secretaría Prueba", email: EMAIL_SECRETARIA, password: "clave123", rol: "SECRETARIA", organismoId: null });
    const sesion = await request(app).post("/api/auth/login").send({ email: EMAIL_FELIGRES, password: "clave123" });
    token = sesion.body.token;
    const horario = await prisma.horarioSacramento.create({
      data: { tipo: "UNCION_ENFERMOS", inicio: new Date(Date.now() + 24 * 60 * 60 * 1000), cupos: 1 },
    });
    horarioId = horario.id;
  });

  afterAll(async () => {
    await prisma.solicitudSacramento.deleteMany({ where: { horarioId } });
    await prisma.horarioSacramento.deleteMany({ where: { id: horarioId } });
    await prisma.usuario.deleteMany({ where: { email: { in: [EMAIL_FELIGRES, EMAIL_SECRETARIA] } } });
    await prisma.$disconnect();
  });

  it("debe avisar por correo al feligrés y a la secretaría cuando se cancela", async () => {
    const reserva = await request(app)
      .post("/api/sacramentos/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ horarioId, nombreBeneficiario: "Paciente Prueba" });
    vi.mocked(enviarCorreoEstadoSolicitud).mockClear();

    const response = await request(app)
      .patch(`/api/sacramentos/solicitudes/${reserva.body.id}/cancelar`)
      .set("Authorization", `Bearer ${token}`);
    await vi.waitFor(() => expect(enviarAvisoCancelacion).toHaveBeenCalled());

    expect(response.statusCode).toBe(200);
    expect(enviarCorreoEstadoSolicitud).toHaveBeenCalledWith(expect.objectContaining({ estado: "CANCELADA" }));
    const destinatarios = vi.mocked(enviarAvisoCancelacion).mock.calls[0]![1];
    expect(destinatarios).toContainEqual({ nombre: "Secretaría Prueba", email: EMAIL_SECRETARIA });
  });
});
