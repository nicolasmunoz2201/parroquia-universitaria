import { describe, expect, it } from "vitest";
import { calcularCuposDisponibles } from "../../utils/sacramentos";

describe("Cálculo de cupos disponibles - Pruebas Unitarias", () => {
  it("debe restar los cupos ocupados al total del horario", () => {
    const disponibles = calcularCuposDisponibles(4, 1);

    expect(disponibles).toBe(3);
  });

  it("debe devolver todos los cupos si nadie ha reservado", () => {
    const disponibles = calcularCuposDisponibles(5, 0);

    expect(disponibles).toBe(5);
  });

  it("debe devolver 0 cuando el horario está lleno", () => {
    const disponibles = calcularCuposDisponibles(2, 2);

    expect(disponibles).toBe(0);
  });

  it("nunca debe devolver un número negativo", () => {
    const disponibles = calcularCuposDisponibles(2, 3);

    expect(disponibles).toBe(0);
  });
});
