import { describe, expect, it } from "vitest";
import {
  calcularEstadoStock,
  diasParaVencer,
  fechaSinHora,
  planificarSalida,
  redondearCantidad,
} from "../../utils/inventario";

function lote(id: string, cantidad: number, vencimiento: string | null, creado: string) {
  return {
    id,
    cantidadDisponible: cantidad,
    fechaVencimiento: vencimiento ? fechaSinHora(vencimiento) : null,
    createdAt: new Date(creado),
  };
}

describe("Salida de insumos por fecha de vencimiento (FEFO) - Pruebas Unitarias", () => {
  it("debe descontar primero del lote que vence antes", () => {
    const lotes = [
      lote("tarde", 5, "2026-12-20", "2026-11-01"),
      lote("pronto", 5, "2026-11-10", "2026-11-02"),
    ];

    const { descuentos, faltante } = planificarSalida(lotes, 3);

    expect(descuentos).toEqual([{ loteId: "pronto", cantidad: 3 }]);
    expect(faltante).toBe(0);
  });

  it("debe repartir la salida entre varios lotes cuando uno no alcanza", () => {
    const lotes = [
      lote("pronto", 2, "2026-11-10", "2026-11-01"),
      lote("tarde", 5, "2026-12-20", "2026-11-01"),
    ];

    const { descuentos } = planificarSalida(lotes, 4.5);

    expect(descuentos).toEqual([
      { loteId: "pronto", cantidad: 2 },
      { loteId: "tarde", cantidad: 2.5 },
    ]);
  });

  it("debe dejar al final los lotes sin fecha de vencimiento", () => {
    const lotes = [
      lote("sin-fecha", 10, null, "2026-10-01"),
      lote("con-fecha", 1, "2027-01-01", "2026-11-01"),
    ];

    const { descuentos } = planificarSalida(lotes, 2);

    expect(descuentos[0]).toEqual({ loteId: "con-fecha", cantidad: 1 });
    expect(descuentos[1]).toEqual({ loteId: "sin-fecha", cantidad: 1 });
  });

  it("debe informar cuánto falta si no hay stock suficiente", () => {
    const { faltante } = planificarSalida([lote("unico", 1.5, null, "2026-11-01")], 4);

    expect(faltante).toBe(2.5);
  });
});

describe("Estado del stock y vencimientos - Pruebas Unitarias", () => {
  it("debe clasificar el stock según el mínimo", () => {
    expect(calcularEstadoStock(0, 5)).toBe("SIN_STOCK");
    expect(calcularEstadoStock(3, 5)).toBe("BAJO_MINIMO");
    expect(calcularEstadoStock(5, 5)).toBe("SUFICIENTE");
  });

  it("debe redondear las cantidades a dos decimales", () => {
    expect(redondearCantidad(0.1 + 0.2)).toBe(0.3);
    expect(redondearCantidad(2.005)).toBe(2.01);
  });

  it("debe calcular los días que faltan para vencer según la fecha de Chile", () => {
    const ahora = new Date("2026-11-04T15:00:00.000Z");

    expect(diasParaVencer(fechaSinHora("2026-11-11"), ahora)).toBe(7);
    expect(diasParaVencer(fechaSinHora("2026-11-04"), ahora)).toBe(0);
    expect(diasParaVencer(fechaSinHora("2026-11-01"), ahora)).toBe(-3);
  });
});
