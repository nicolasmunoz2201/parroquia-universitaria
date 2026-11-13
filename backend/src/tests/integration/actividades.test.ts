import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";
import { procesarPlazos } from "../../services/actividad.service";
import { enviarCorreoInscripcion } from "../../utils/correo";

vi.mock("../../utils/correo", () => ({
  correoConfigurado: () => true,
  enviarCorreoInscripcion: vi.fn().mockResolvedValue(undefined),
  enviarCorreoEstadoSolicitud: vi.fn().mockResolvedValue(undefined),
  enviarAvisoCancelacion: vi.fn().mockResolvedValue(undefined),
  enviarCorreoRecuperacion: vi.fn(),
}));

const HORA = 60 * 60 * 1000;
const SUFIJO = Date.now();
const correos = (nombre: string) => `${nombre}-${SUFIJO}@prueba.cl`;
const EMAILS = ["encargado-a", "encargado-b", "ana", "bruno", "carla"].map(correos);
const organismos: string[] = [];
const actividades: string[] = [];
const tokens: Record<string, string> = {};

function como(nombre: string) {
  const token = tokens[nombre];
  return {
    get: (ruta: string) => request(app).get(ruta).set("Authorization", `Bearer ${token}`),
    post: (ruta: string, body: object = {}) => request(app).post(ruta).set("Authorization", `Bearer ${token}`).send(body),
    patch: (ruta: string, body: object = {}) => request(app).patch(ruta).set("Authorization", `Bearer ${token}`).send(body),
  };
}

function enHoras(horas: number) {
  return new Date(Date.now() + horas * HORA);
}

async function moverActividad(id: string, horas: number) {
  await prisma.actividad.update({ where: { id }, data: { inicio: enHoras(horas) } });
}

function correoEnviado(evento: string, email: string) {
  return vi.mocked(enviarCorreoInscripcion).mock.calls.some(
    ([tipo, datos]) => tipo === evento && datos.usuario.email === email
  );
}

describe("Inscripción a actividades - Prueba de Integración", () => {
  let actividadId = "";
  const inscripcion = { ana: "", bruno: "" };

  beforeAll(async () => {
    for (const letra of ["A", "B"]) {
      const organismo = await prisma.organismo.create({ data: { nombre: `Organismo ${letra} prueba ${SUFIJO}` } });
      organismos.push(organismo.id);
    }
    const usuarios: [string, "ENCARGADO_ORGANISMO" | "FELIGRES", string | null][] = [
      ["encargado-a", "ENCARGADO_ORGANISMO", organismos[0]!],
      ["encargado-b", "ENCARGADO_ORGANISMO", organismos[1]!],
      ["ana", "FELIGRES", null],
      ["bruno", "FELIGRES", null],
      ["carla", "FELIGRES", null],
    ];
    for (const [nombre, rol, organismoId] of usuarios) {
      await crearUsuario({ nombre, email: correos(nombre), password: "clave123", rol, organismoId });
      const sesion = await request(app).post("/api/auth/login").send({ email: correos(nombre), password: "clave123" });
      tokens[nombre] = sesion.body.token;
    }
  });

  afterAll(async () => {
    await prisma.inscripcion.deleteMany({ where: { actividadId: { in: actividades } } });
    await prisma.actividad.deleteMany({ where: { id: { in: actividades } } });
    await prisma.usuario.deleteMany({ where: { email: { in: EMAILS } } });
    await prisma.organismo.deleteMany({ where: { id: { in: organismos } } });
    await prisma.$disconnect();
  });

  it("no debe permitir que un encargado publique en otro organismo", async () => {
    const response = await como("encargado-b").post("/api/actividades", {
      titulo: "Retiro",
      descripcion: "Retiro de prueba",
      inicio: enHoras(120).toISOString(),
      cupos: 1,
      organismoId: organismos[0],
    });

    expect(response.statusCode).toBe(403);
  });

  it("debe rechazar una actividad que empieza en menos de 24 horas", async () => {
    const response = await como("encargado-a").post("/api/actividades", {
      titulo: "Retiro",
      descripcion: "Retiro de prueba",
      inicio: enHoras(10).toISOString(),
      cupos: 1,
      organismoId: organismos[0],
    });

    expect(response.statusCode).toBe(400);
  });

  it("debe publicar la actividad y mostrarla a todos", async () => {
    const response = await como("encargado-a").post("/api/actividades", {
      titulo: `Retiro de jóvenes ${SUFIJO}`,
      descripcion: "Retiro de un día en la parroquia",
      inicio: enHoras(120).toISOString(),
      cupos: 1,
      organismoId: organismos[0],
    });
    actividadId = response.body.id;
    actividades.push(actividadId);
    const publicas = await request(app).get("/api/actividades");

    expect(response.statusCode).toBe(201);
    expect(publicas.body.find((a: { id: string }) => a.id === actividadId)).toMatchObject({ cuposDisponibles: 1 });
  });

  it("debe dejar pendiente al primero y en espera al segundo cuando el cupo se llena", async () => {
    const ana = await como("ana").post(`/api/actividades/${actividadId}/inscripciones`);
    const bruno = await como("bruno").post(`/api/actividades/${actividadId}/inscripciones`);
    const repetida = await como("ana").post(`/api/actividades/${actividadId}/inscripciones`);
    inscripcion.ana = ana.body.id;
    inscripcion.bruno = bruno.body.id;

    expect(ana.body.estado).toBe("PENDIENTE");
    expect(bruno.body.estado).toBe("EN_ESPERA");
    expect(repetida.statusCode).toBe(409);
    expect(correoEnviado("EN_ESPERA", correos("bruno"))).toBe(true);
  });

  it("no debe mostrar los inscritos a un encargado de otro organismo", async () => {
    const response = await como("encargado-b").get(`/api/actividades/${actividadId}/inscritos`);

    expect(response.statusCode).toBe(404);
  });

  it("al rechazar con motivo debe subir al primero de la lista de espera", async () => {
    const sinMotivo = await como("encargado-a").patch(`/api/actividades/inscripciones/${inscripcion.ana}/decision`, { aceptar: false });
    const rechazo = await como("encargado-a").patch(`/api/actividades/inscripciones/${inscripcion.ana}/decision`, {
      aceptar: false,
      motivo: "La actividad es solo para confirmandos",
    });
    const bruno = await prisma.inscripcion.findUnique({ where: { id: inscripcion.bruno } });

    expect(sinMotivo.statusCode).toBe(400);
    expect(rechazo.body.estado).toBe("RECHAZADA");
    expect(bruno?.estado).toBe("PENDIENTE");
    expect(correoEnviado("PROMOVIDA", correos("bruno"))).toBe(true);
  });

  it("solo debe permitir confirmar entre 48 y 24 horas antes", async () => {
    await como("encargado-a").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/decision`, { aceptar: true });
    const temprano = await como("bruno").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/confirmar`);
    await moverActividad(actividadId, 36);
    const { recordatorios } = await procesarPlazos();
    const aTiempo = await como("bruno").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/confirmar`);

    expect(temprano.statusCode).toBe(409);
    expect(recordatorios.some((i) => i.id === inscripcion.bruno)).toBe(true);
    expect(aTiempo.body.estado).toBe("CONFIRMADA");
  });

  it("si cambia la fecha debe avisar y pedir confirmar de nuevo", async () => {
    const actividad = await prisma.actividad.findUniqueOrThrow({ where: { id: actividadId } });
    const response = await request(app)
      .put(`/api/actividades/${actividadId}`)
      .set("Authorization", `Bearer ${tokens["encargado-a"]}`)
      .send({
        titulo: actividad.titulo,
        descripcion: actividad.descripcion,
        inicio: enHoras(60).toISOString(),
        cupos: actividad.cupos,
      });
    const bruno = await prisma.inscripcion.findUnique({ where: { id: inscripcion.bruno } });

    expect(response.statusCode).toBe(200);
    expect(bruno?.estado).toBe("ACEPTADA");
    expect(correoEnviado("ACTIVIDAD_MODIFICADA", correos("bruno"))).toBe(true);

    await moverActividad(actividadId, 36);
    const reconfirmacion = await como("bruno").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/confirmar`);
    expect(reconfirmacion.body.estado).toBe("CONFIRMADA");
  });

  it("debe marcar la asistencia solo cuando la actividad ya comenzó, y ya no permitir editarla ni cancelarla", async () => {
    const antes = await como("encargado-a").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/asistencia`, { asistio: true });
    await moverActividad(actividadId, -1);
    const despues = await como("encargado-a").patch(`/api/actividades/inscripciones/${inscripcion.bruno}/asistencia`, { asistio: true });
    const cancelar = await como("encargado-a").patch(`/api/actividades/${actividadId}/cancelar`);

    expect(antes.statusCode).toBe(409);
    expect(despues.body.asistio).toBe(true);
    expect(cancelar.statusCode).toBe(409);
  });

  it("al avisar que no podrá asistir debe pasar el cupo al siguiente, y liberar a quien no confirma", async () => {
    const creada = await como("encargado-a").post("/api/actividades", {
      titulo: `Misión solidaria ${SUFIJO}`,
      descripcion: "Visita a un hogar de ancianos",
      inicio: enHoras(120).toISOString(),
      cupos: 1,
      organismoId: organismos[0],
    });
    actividades.push(creada.body.id);
    const carla = await como("carla").post(`/api/actividades/${creada.body.id}/inscripciones`);
    const ana = await como("ana").post(`/api/actividades/${creada.body.id}/inscripciones`);
    const cancelacion = await como("carla").patch(`/api/actividades/inscripciones/${carla.body.id}/cancelar`);
    const anaPromovida = await prisma.inscripcion.findUnique({ where: { id: ana.body.id } });

    await moverActividad(creada.body.id, 20);
    const aceptarTarde = await como("encargado-a").patch(`/api/actividades/inscripciones/${ana.body.id}/decision`, { aceptar: true });
    const { noAprobadas } = await procesarPlazos();

    expect(ana.body.estado).toBe("EN_ESPERA");
    expect(cancelacion.body.estado).toBe("CANCELADA");
    expect(anaPromovida?.estado).toBe("PENDIENTE");
    expect(aceptarTarde.statusCode).toBe(409);
    expect(noAprobadas.some((i) => i.id === ana.body.id)).toBe(true);
  });

  it("no debe permitir inscribirse en actividades de un organismo desactivado", async () => {
    const creada = await como("encargado-b").post("/api/actividades", {
      titulo: `Taller organismo B ${SUFIJO}`,
      descripcion: "Taller de prueba",
      inicio: enHoras(120).toISOString(),
      cupos: 5,
      organismoId: organismos[1],
    });
    actividades.push(creada.body.id);
    await prisma.organismo.update({ where: { id: organismos[1]! }, data: { activo: false } });
    const response = await como("carla").post(`/api/actividades/${creada.body.id}/inscripciones`);

    expect(response.statusCode).toBe(409);
  });

  it("al cancelar la actividad debe avisar a los inscritos vigentes", async () => {
    const creada = await como("encargado-a").post("/api/actividades", {
      titulo: `Charla vocacional ${SUFIJO}`,
      descripcion: "Charla abierta",
      inicio: enHoras(120).toISOString(),
      cupos: 5,
      organismoId: organismos[0],
    });
    actividades.push(creada.body.id);
    await como("carla").post(`/api/actividades/${creada.body.id}/inscripciones`);
    const response = await como("encargado-a").patch(`/api/actividades/${creada.body.id}/cancelar`);

    expect(response.body.avisados).toBe(1);
    expect(correoEnviado("ACTIVIDAD_CANCELADA", correos("carla"))).toBe(true);
  });
});
