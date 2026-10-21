import { describe, expect, it } from "vitest";
import { compararPassword, encriptarPassword } from "../../utils/password";

describe("Password Helper - Pruebas Unitarias", () => {
  it("debe encriptar una contraseña correctamente y generar un hash válido", async () => {
    const password = "Password123!";
    const hash = await encriptarPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  it("debe retornar true cuando la contraseña coincide con el hash", async () => {
    const password = "Password123!";
    const hash = await encriptarPassword(password);
    const esValida = await compararPassword(password, hash);

    expect(esValida).toBe(true);
  });

  it("debe retornar false si la contraseña es incorrecta", async () => {
    const password = "Password123!";
    const hash = await encriptarPassword(password);
    const esValida = await compararPassword("ClaveIncorrecta", hash);

    expect(esValida).toBe(false);
  });
});
