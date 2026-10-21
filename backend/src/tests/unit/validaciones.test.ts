import { describe, expect, it } from "vitest";
import { leerEmail, validarDatosCuenta, validarPassword } from "../../utils/validaciones";

describe("Validaciones de cuenta - Pruebas Unitarias", () => {
  it("debe limpiar espacios y dejar el correo en minúsculas", () => {
    const email = leerEmail("  Nicolas@Correo.CL  ");

    expect(email).toBe("nicolas@correo.cl");
  });

  it("debe rechazar una contraseña de menos de 6 caracteres", () => {
    const error = validarPassword("123");

    expect(error).toBe("La contraseña debe tener al menos 6 caracteres");
  });

  it("debe pedir todos los datos si falta alguno", () => {
    const error = validarDatosCuenta("Nicolas", "", "clave123");

    expect(error).toBe("nombre, email y password son requeridos");
  });

  it("debe rechazar un correo sin formato válido", () => {
    const error = validarDatosCuenta("Nicolas", "correo-sin-arroba", "clave123");

    expect(error).toBe("El correo no tiene un formato valido");
  });

  it("debe aceptar datos correctos y no devolver error", () => {
    const error = validarDatosCuenta("Nicolas", "nicolas@correo.cl", "clave123");

    expect(error).toBeNull();
  });
});
