import { describe, expect, it } from "vitest";
import { problemaConDocumentos } from "../../utils/sacramentos";

const REQUERIDOS_BAUTISMO = ["Certificado de nacimiento", "Cédula de identidad de padrinos"];

describe("Validación de documentos de una solicitud - Pruebas Unitarias", () => {
  it("debe aceptar la solicitud cuando están todos los documentos", () => {
    const documentos = [
      { tipoDocumento: "Certificado de nacimiento" },
      { tipoDocumento: "Cédula de identidad de padrinos" },
    ];

    expect(problemaConDocumentos(documentos, REQUERIDOS_BAUTISMO, true)).toBeNull();
  });

  it("debe indicar qué documento falta subir", () => {
    const documentos = [{ tipoDocumento: "Certificado de nacimiento" }];

    expect(problemaConDocumentos(documentos, REQUERIDOS_BAUTISMO, true)).toBe(
      "Falta subir: Cédula de identidad de padrinos"
    );
  });

  it("debe rechazar un documento que el sacramento no pide", () => {
    const documentos = [
      { tipoDocumento: "Certificado de nacimiento" },
      { tipoDocumento: "Foto carnet" },
    ];

    expect(problemaConDocumentos(documentos, REQUERIDOS_BAUTISMO, true)).toBe(
      "Uno de los documentos no corresponde a este sacramento"
    );
  });

  it("debe rechazar dos archivos para el mismo documento", () => {
    const documentos = [
      { tipoDocumento: "Certificado de nacimiento" },
      { tipoDocumento: "Certificado de nacimiento" },
    ];

    expect(problemaConDocumentos(documentos, REQUERIDOS_BAUTISMO, true)).toBe(
      "Subiste dos archivos para el mismo documento"
    );
  });

  it("al corregir debe exigir al menos un documento", () => {
    expect(problemaConDocumentos([], REQUERIDOS_BAUTISMO, false)).toBe(
      "Sube al menos un documento corregido"
    );
  });
});
