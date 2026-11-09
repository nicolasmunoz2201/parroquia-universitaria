import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import prisma from "../../config/prisma";

describe("CORS - Prueba de Integración", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("debe permitir las peticiones que vienen del frontend configurado", async () => {
    const origen = process.env.FRONTEND_URL!.replace(/\/+$/, "");
    const response = await request(app).get("/api/organismos").set("Origin", origen);

    expect(response.headers["access-control-allow-origin"]).toBe(origen);
  });

  it("no debe autorizar a un sitio web desconocido", async () => {
    const response = await request(app).get("/api/organismos").set("Origin", "https://sitio-desconocido.com");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
