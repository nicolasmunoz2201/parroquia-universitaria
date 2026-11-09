import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";
import { hoyEnChile } from "../../utils/inventario";

const SUFIJO = Date.now();
const EMAIL_COMEDOR = `comedor-${SUFIJO}@prueba.cl`;
const EMAIL_FELIGRES = `feligres-inventario-${SUFIJO}@prueba.cl`;
const DONANTE = `Supermercado prueba ${SUFIJO}`;
const insumosCreados: string[] = [];
let tokenComedor = "";
let tokenFeligres = "";
let arrozId = "";

function enDias(dias: number) {
  const fecha = new Date(`${hoyEnChile()}T00:00:00.000Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

async function crearConSesion(email: string, rol: "ENCARGADO_COMEDOR" | "FELIGRES") {
  await crearUsuario({ nombre: "Usuario Prueba", email, password: "clave123", rol, organismoId: null });
  const response = await request(app).post("/api/auth/login").send({ email, password: "clave123" });
  return response.body.token as string;
}

function como(token: string) {
  return {
    get: (ruta: string) => request(app).get(ruta).set("Authorization", `Bearer ${token}`),
    post: (ruta: string, body: object) => request(app).post(ruta).set("Authorization", `Bearer ${token}`).send(body),
    del: (ruta: string) => request(app).delete(ruta).set("Authorization", `Bearer ${token}`),
    patch: (ruta: string) => request(app).patch(ruta).set("Authorization", `Bearer ${token}`),
  };
}

describe("API de inventario del comedor - Prueba de Integración", () => {
  beforeAll(async () => {
    tokenComedor = await crearConSesion(EMAIL_COMEDOR, "ENCARGADO_COMEDOR");
    tokenFeligres = await crearConSesion(EMAIL_FELIGRES, "FELIGRES");
  });

  afterAll(async () => {
    await prisma.movimientoInventario.deleteMany({ where: { insumoId: { in: insumosCreados } } });
    await prisma.lote.deleteMany({ where: { insumoId: { in: insumosCreados } } });
    await prisma.insumo.deleteMany({ where: { id: { in: insumosCreados } } });
    await prisma.donante.deleteMany({ where: { nombre: DONANTE } });
    await prisma.usuario.deleteMany({ where: { email: { in: [EMAIL_COMEDOR, EMAIL_FELIGRES] } } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 403 a un feligrés", async () => {
    const response = await como(tokenFeligres).get("/api/inventario/insumos");

    expect(response.statusCode).toBe(403);
  });

  it("debe crear un insumo con status 201", async () => {
    const response = await como(tokenComedor).post("/api/inventario/insumos", {
      nombre: `Arroz prueba ${SUFIJO}`,
      categoria: "Abarrotes",
      unidad: "KILOGRAMO",
      stockMinimo: 10,
    });

    arrozId = response.body.id;
    insumosCreados.push(arrozId);
    expect(response.statusCode).toBe(201);
  });

  it("debe rechazar con status 409 un insumo con un nombre repetido", async () => {
    const response = await como(tokenComedor).post("/api/inventario/insumos", {
      nombre: `ARROZ PRUEBA ${SUFIJO}`,
      categoria: "Abarrotes",
      unidad: "KILOGRAMO",
    });

    expect(response.statusCode).toBe(409);
  });

  it("debe registrar dos donaciones con distinta fecha de vencimiento", async () => {
    const tarde = await como(tokenComedor).post("/api/inventario/movimientos/entrada", {
      insumoId: arrozId,
      cantidad: 8,
      motivo: "DONACION",
      donante: DONANTE,
      fechaVencimiento: enDias(60),
    });
    const pronto = await como(tokenComedor).post("/api/inventario/movimientos/entrada", {
      insumoId: arrozId,
      cantidad: 3,
      motivo: "DONACION",
      donante: DONANTE,
      fechaVencimiento: enDias(5),
    });

    expect(tarde.statusCode).toBe(201);
    expect(pronto.statusCode).toBe(201);
    expect(pronto.body.lote.donante.nombre).toBe(DONANTE);
  });

  it("debe rechazar con status 400 un producto que ya venció", async () => {
    const response = await como(tokenComedor).post("/api/inventario/movimientos/entrada", {
      insumoId: arrozId,
      cantidad: 1,
      motivo: "COMPRA",
      fechaVencimiento: enDias(-1),
    });

    expect(response.statusCode).toBe(400);
  });

  it("debe descontar primero del lote que vence antes", async () => {
    const response = await como(tokenComedor).post("/api/inventario/movimientos/salida", {
      insumoId: arrozId,
      cantidad: 2,
      motivo: "CONSUMO",
    });
    const lotes = await prisma.lote.findMany({ where: { insumoId: arrozId }, orderBy: { fechaVencimiento: "asc" } });

    expect(response.statusCode).toBe(201);
    expect(lotes.map((lote) => lote.cantidadDisponible)).toEqual([1, 8]);
  });

  it("debe rechazar con status 409 una salida mayor que el stock", async () => {
    const response = await como(tokenComedor).post("/api/inventario/movimientos/salida", {
      insumoId: arrozId,
      cantidad: 50,
      motivo: "CONSUMO",
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toBe("No hay stock suficiente: quedan 9 kg");
  });

  it("debe exigir una observación cuando la salida es por merma", async () => {
    const response = await como(tokenComedor).post("/api/inventario/movimientos/salida", {
      insumoId: arrozId,
      cantidad: 1,
      motivo: "MERMA",
    });

    expect(response.statusCode).toBe(400);
  });

  it("debe ajustar el stock con un conteo físico", async () => {
    const response = await como(tokenComedor).post("/api/inventario/movimientos/conteo", {
      insumoId: arrozId,
      cantidadReal: 8.5,
      observacion: "Conteo semanal",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({ tipo: "SALIDA", motivo: "CONTEO_FISICO", cantidad: 0.5 });
  });

  it("debe mostrar el stock calculado y las alertas de bajo mínimo y vencimiento", async () => {
    const insumos = await como(tokenComedor).get("/api/inventario/insumos");
    const alertas = await como(tokenComedor).get("/api/inventario/alertas");
    const arroz = insumos.body.find((insumo: { id: string }) => insumo.id === arrozId);

    expect(arroz).toMatchObject({ stock: 8.5, estado: "BAJO_MINIMO", tieneMovimientos: true });
    expect(alertas.body.bajoMinimo.some((insumo: { id: string }) => insumo.id === arrozId)).toBe(true);
    expect(alertas.body.porVencer.some((lote: { insumoId: string }) => lote.insumoId === arrozId)).toBe(true);
  });

  it("no debe eliminar un insumo con movimientos, pero sí desactivarlo", async () => {
    const eliminar = await como(tokenComedor).del(`/api/inventario/insumos/${arrozId}`);
    const desactivar = await como(tokenComedor).patch(`/api/inventario/insumos/${arrozId}/desactivar`);
    const entrada = await como(tokenComedor).post("/api/inventario/movimientos/entrada", {
      insumoId: arrozId,
      cantidad: 1,
      motivo: "COMPRA",
    });

    expect(eliminar.statusCode).toBe(409);
    expect(desactivar.body.activo).toBe(false);
    expect(entrada.statusCode).toBe(409);
  });

  it("debe entregar el reporte con el consumo y las donaciones", async () => {
    const response = await como(tokenComedor).get("/api/inventario/reporte");

    expect(response.statusCode).toBe(200);
    expect(response.body.movimientosPorMes).toHaveLength(6);
    expect(response.body.donacionesPorDonante.some((d: { nombre: string }) => d.nombre === DONANTE)).toBe(true);
  });
});
