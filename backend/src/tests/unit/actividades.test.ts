import { describe, expect, it } from "vitest";
import {
  calcularCuposLibres,
  inscripcionesAbiertas,
  puedeConfirmarAsistencia,
} from "../../utils/actividades";

const HORA = 60 * 60 * 1000;
const INICIO = new Date("2026-12-10T19:00:00.000Z");

function horasAntes(horas: number) {
  return new Date(INICIO.getTime() - horas * HORA);
}

describe("Plazos de inscripción a actividades - Pruebas Unitarias", () => {
  it("debe mantener abiertas las inscripciones hasta 24 horas antes", () => {
    expect(inscripcionesAbiertas(INICIO, horasAntes(25))).toBe(true);
    expect(inscripcionesAbiertas(INICIO, horasAntes(24))).toBe(false);
    expect(inscripcionesAbiertas(INICIO, horasAntes(2))).toBe(false);
  });

  it("no debe permitir confirmar asistencia antes de las 48 horas previas", () => {
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(72))).toBe(false);
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(49))).toBe(false);
  });

  it("debe permitir confirmar entre 48 y 24 horas antes", () => {
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(48))).toBe(true);
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(30))).toBe(true);
  });

  it("no debe permitir confirmar desde 24 horas antes", () => {
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(24))).toBe(false);
    expect(puedeConfirmarAsistencia(INICIO, horasAntes(1))).toBe(false);
  });

  it("debe calcular los cupos libres sin bajar de cero", () => {
    expect(calcularCuposLibres(10, 4)).toBe(6);
    expect(calcularCuposLibres(3, 3)).toBe(0);
    expect(calcularCuposLibres(2, 5)).toBe(0);
  });
});
