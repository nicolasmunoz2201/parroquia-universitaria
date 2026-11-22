import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";
import { crearUsuario } from "../../services/usuario.service";

const SUFIJO = Date.now();
const EMAIL_FELIGRES = `feligres-memoria-${SUFIJO}@prueba.cl`;
const FOTO_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const hitosCreados: string[] = [];
let tokenAdmin = "";
let tokenFeligres = "";

function rutaDeFoto(url: string) {
  return path.join(__dirname, "../../../uploads", path.basename(url));
}

describe("Memoria histórica - Prueba de Integración", () => {
  beforeAll(async () => {
    await crearUsuario({ nombre: "Feligrés Prueba", email: EMAIL_FELIGRES, password: "clave123", rol: "FELIGRES", organismoId: null });
    const admin = await request(app)
      .post("/api/auth/login")
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    tokenAdmin = admin.body.token;
    const feligres = await request(app).post("/api/auth/login").send({ email: EMAIL_FELIGRES, password: "clave123" });
    tokenFeligres = feligres.body.token;
  });

  afterAll(async () => {
    for (const id of hitosCreados) {
      await request(app).delete(`/api/memoria/hitos/${id}`).set("Authorization", `Bearer ${tokenAdmin}`);
    }
    await prisma.usuario.deleteMany({ where: { email: EMAIL_FELIGRES } });
    await prisma.$disconnect();
  });

  it("debe rechazar con status 403 que un feligrés cree un hito", async () => {
    const response = await request(app)
      .post("/api/memoria/hitos")
      .set("Authorization", `Bearer ${tokenFeligres}`)
      .field("titulo", "Hito no permitido")
      .field("descripcion", "No debería guardarse")
      .field("fecha", "1990-05-01");

    expect(response.statusCode).toBe(403);
  });

  it("debe rechazar con status 400 un hito con fecha futura", async () => {
    const response = await request(app)
      .post("/api/memoria/hitos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("titulo", `Hito futuro ${SUFIJO}`)
      .field("descripcion", "Todavía no ocurre")
      .field("fecha", "2999-01-01");

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "Un hito histórico no puede tener una fecha futura");
  });

  it("debe crear un hito con su foto y mostrarlo en orden cronológico a cualquier visitante", async () => {
    const reciente = await request(app)
      .post("/api/memoria/hitos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("titulo", `Nuevo templo ${SUFIJO}`)
      .field("descripcion", "Se inaugura el templo parroquial")
      .field("fecha", "1975-03-19")
      .attach("fotos", FOTO_PNG, { filename: "templo.png", contentType: "image/png" });
    const antiguo = await request(app)
      .post("/api/memoria/hitos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("titulo", `Fundación ${SUFIJO}`)
      .field("descripcion", "Nace la Parroquia Universitaria")
      .field("fecha", "1960-08-15");

    expect(reciente.statusCode).toBe(201);
    expect(antiguo.statusCode).toBe(201);
    hitosCreados.push(reciente.body.id, antiguo.body.id);
    expect(reciente.body.fotos).toHaveLength(1);
    expect(fs.existsSync(rutaDeFoto(reciente.body.fotos[0].url))).toBe(true);

    const lista = await request(app).get("/api/memoria/hitos");
    const nuestros = lista.body.filter((hito: { titulo: string }) => hito.titulo.endsWith(String(SUFIJO)));

    expect(lista.statusCode).toBe(200);
    expect(nuestros.map((hito: { titulo: string }) => hito.titulo)).toEqual([`Fundación ${SUFIJO}`, `Nuevo templo ${SUFIJO}`]);
  });

  it("debe agregar un testimonio al hito y exigir que tenga contenido", async () => {
    const [hitoId] = hitosCreados;

    const sinContenido = await request(app)
      .post(`/api/memoria/hitos/${hitoId}/testimonios`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ autorNombre: "María González", contenido: "   " });
    const valido = await request(app)
      .post(`/api/memoria/hitos/${hitoId}/testimonios`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ autorNombre: "María González", contenido: "Recuerdo la primera misa en el templo nuevo." });

    expect(sinContenido.statusCode).toBe(400);
    expect(valido.statusCode).toBe(201);

    const lista = await request(app).get("/api/memoria/hitos");
    const hito = lista.body.find((h: { id: string }) => h.id === hitoId);
    expect(hito.testimonios).toHaveLength(1);
    expect(hito.testimonios[0]).toHaveProperty("autorNombre", "María González");
  });

  it("debe editar las fotos de un hito: conservar una, quitar otra y sumar una nueva", async () => {
    const creado = await request(app)
      .post("/api/memoria/hitos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("titulo", `Misión solidaria ${SUFIJO}`)
      .field("descripcion", "Primera misión de verano")
      .field("fecha", "1990-01-10")
      .attach("fotos", FOTO_PNG, { filename: "uno.png", contentType: "image/png" })
      .attach("fotos", FOTO_PNG, { filename: "dos.png", contentType: "image/png" });
    hitosCreados.push(creado.body.id);
    const [conservar, quitar] = creado.body.fotos;

    const editado = await request(app)
      .put(`/api/memoria/hitos/${creado.body.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("titulo", `Misión solidaria ${SUFIJO}`)
      .field("descripcion", "Primera misión de verano")
      .field("fecha", "1990-01-10")
      .field("fotosConservar", JSON.stringify([conservar.id]))
      .attach("fotos", FOTO_PNG, { filename: "tres.png", contentType: "image/png" });

    expect(editado.statusCode).toBe(200);
    expect(editado.body.fotos).toHaveLength(2);
    expect(editado.body.fotos.map((foto: { id: string }) => foto.id)).toContain(conservar.id);
    expect(editado.body.fotos.map((foto: { id: string }) => foto.id)).not.toContain(quitar.id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fs.existsSync(rutaDeFoto(conservar.url))).toBe(true);
    expect(fs.existsSync(rutaDeFoto(quitar.url))).toBe(false);
  });

  it("debe eliminar el hito junto con sus fotos y testimonios", async () => {
    const hitoId = hitosCreados.shift()!;
    const hito = await prisma.hitoHistorico.findUnique({ where: { id: hitoId }, include: { fotos: true } });
    const archivo = rutaDeFoto(hito!.fotos[0]!.url);

    const response = await request(app).delete(`/api/memoria/hitos/${hitoId}`).set("Authorization", `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(204);
    expect(await prisma.fotoHito.count({ where: { hitoId } })).toBe(0);
    expect(await prisma.testimonio.count({ where: { hitoId } })).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fs.existsSync(archivo)).toBe(false);
  });
});
