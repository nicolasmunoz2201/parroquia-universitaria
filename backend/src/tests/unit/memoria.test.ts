import { describe, expect, it } from "vitest";
import { leerFechaHito, separarFotos } from "../../utils/memoria";

const AHORA = new Date("2026-11-22T15:00:00Z");

describe("Fecha de un hito histórico - Pruebas Unitarias", () => {
  it("debe aceptar una fecha pasada y guardarla al mediodía para no cambiar de día", () => {
    const resultado = leerFechaHito("1965-04-10", AHORA);

    expect(resultado).toEqual({ fecha: new Date("1965-04-10T12:00:00Z") });
  });

  it("debe rechazar una fecha futura", () => {
    const resultado = leerFechaHito("2027-01-01", AHORA);

    expect(resultado).toEqual({ error: "Un hito histórico no puede tener una fecha futura" });
  });

  it("debe rechazar una fecha que no existe en el calendario", () => {
    const resultado = leerFechaHito("2023-02-30", AHORA);

    expect(resultado).toEqual({ error: "La fecha del hito no es válida" });
  });

  it("debe rechazar un formato distinto de año-mes-día", () => {
    expect(leerFechaHito("10/04/1965", AHORA)).toEqual({ error: "Indica la fecha del hito" });
    expect(leerFechaHito(undefined, AHORA)).toEqual({ error: "Indica la fecha del hito" });
  });

  it("debe rechazar fechas anteriores a 1900", () => {
    const resultado = leerFechaHito("1850-01-01", AHORA);

    expect(resultado).toEqual({ error: "La fecha debe ser desde el año 1900" });
  });
});

describe("Fotos al editar un hito - Pruebas Unitarias", () => {
  it("debe quitar solo las fotos que no vienen en la lista a conservar", () => {
    const resultado = separarFotos(["a", "b", "c"], JSON.stringify(["a", "c"]));

    expect(resultado).toEqual({ idsConservar: ["a", "c"], idsQuitar: ["b"] });
  });

  it("debe conservar todas las fotos si no se envía la lista", () => {
    const resultado = separarFotos(["a", "b"], undefined);

    expect(resultado).toEqual({ idsConservar: ["a", "b"], idsQuitar: [] });
  });

  it("debe quitar todas si la lista viene vacía e ignorar ids de otros hitos", () => {
    expect(separarFotos(["a", "b"], "[]")).toEqual({ idsConservar: [], idsQuitar: ["a", "b"] });
    expect(separarFotos(["a"], JSON.stringify(["a", "otro"]))).toEqual({ idsConservar: ["a"], idsQuitar: [] });
  });

  it("debe rechazar una lista mal formada", () => {
    expect(separarFotos(["a"], "no-es-json")).toEqual({ error: "La lista de fotos a conservar no es válida" });
    expect(separarFotos(["a"], JSON.stringify([1, 2]))).toEqual({ error: "La lista de fotos a conservar no es válida" });
  });
});
