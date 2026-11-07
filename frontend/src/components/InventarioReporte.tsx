import { useState } from "react";
import { obtenerReporte } from "../services/inventario.service";
import type { Reporte } from "../services/inventario.service";
import { DIAS_AVISO_VENCIMIENTO, ETIQUETAS_MOTIVO, MOTIVOS_SALIDA } from "../constants/inventario";
import type { MotivoMovimiento } from "../constants/inventario";
import { useCarga } from "../hooks/useCarga";
import { formatearCantidad } from "../utils/inventario";

const REPORTE_VACIO: Reporte = {
  resumen: { insumosActivos: 0, sinStock: 0, bajoMinimo: 0, porVencer: 0, vencidos: 0 },
  movimientosPorMes: [],
  salidasPorMotivo: {},
  consumoPorInsumo: [],
  donacionesPorDonante: [],
};

const MOTIVOS_REPORTE: MotivoMovimiento[] = [...MOTIVOS_SALIDA, "CONTEO_FISICO"];

function nombreMes(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio ?? 2000, (numero ?? 1) - 1, 1)).toLocaleDateString("es-CL", {
    month: "short",
    timeZone: "UTC",
  });
}

function techo(valor: number) {
  if (valor <= 4) return 4;
  const paso = Math.pow(10, Math.floor(Math.log10(valor)));
  return Math.ceil(valor / paso) * paso;
}

interface Tooltip {
  x: number;
  y: number;
  titulo: string;
  filas: { serie: "entradas" | "salidas"; texto: string }[];
}

function GraficoMovimientos({ datos }: { datos: Reporte["movimientosPorMes"] }) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [verTabla, setVerTabla] = useState(false);
  const maximo = techo(Math.max(0, ...datos.flatMap((fila) => [fila.entradas, fila.salidas])));
  const total = datos.reduce((suma, fila) => suma + fila.entradas + fila.salidas, 0);

  function mostrar(elemento: HTMLElement, fila: Reporte["movimientosPorMes"][number]) {
    const caja = elemento.closest(".grafico-columnas")!.getBoundingClientRect();
    const grupo = elemento.getBoundingClientRect();
    const columnas = [...elemento.querySelectorAll(".columna")].map((columna) => columna.getBoundingClientRect());
    const tope = Math.min(grupo.bottom - 24, ...columnas.map((columna) => columna.top));
    const margen = 70;
    setTooltip({
      x: Math.min(Math.max(grupo.left - caja.left + grupo.width / 2, margen), caja.width - margen),
      y: tope - caja.top,
      titulo: nombreMes(fila.mes),
      filas: [
        { serie: "entradas", texto: `${fila.entradas} ${fila.entradas === 1 ? "entrada" : "entradas"}` },
        { serie: "salidas", texto: `${fila.salidas} ${fila.salidas === 1 ? "salida" : "salidas"}` },
      ],
    });
  }

  return (
    <section className="tarjeta-reporte tarjeta-ancha">
      <div className="tarjeta-reporte-encabezado">
        <div>
          <h3>Movimientos por mes</h3>
          <p>Cantidad de entradas y salidas registradas en los últimos {datos.length} meses</p>
        </div>
        <button type="button" className="boton-enlace" onClick={() => setVerTabla((valor) => !valor)}>
          {verTabla ? "Ver gráfico" : "Ver como tabla"}
        </button>
      </div>

      <ul className="leyenda-grafico">
        <li>
          <span className="muestra-serie serie-entradas" aria-hidden="true" />
          Entradas
        </li>
        <li>
          <span className="muestra-serie serie-salidas" aria-hidden="true" />
          Salidas
        </li>
      </ul>

      {verTabla ? (
        <table className="tabla-reporte">
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Entradas</th>
              <th scope="col">Salidas</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((fila) => (
              <tr key={fila.mes}>
                <th scope="row">{nombreMes(fila.mes)}</th>
                <td>{fila.entradas}</td>
                <td>{fila.salidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : total === 0 ? (
        <p className="aviso-vacio">Todavía no hay movimientos registrados en este período.</p>
      ) : (
        <div className="grafico-columnas" onPointerLeave={() => setTooltip(null)}>
          <div className="grafico-eje">
            <span>{maximo}</span>
            <span>{maximo / 2}</span>
            <span>0</span>
          </div>
          <div className="grafico-area">
            <div className="grafico-guia guia-arriba" />
            <div className="grafico-guia guia-medio" />
            {datos.map((fila) => (
              <div
                key={fila.mes}
                className="grafico-grupo"
                tabIndex={0}
                aria-label={`${nombreMes(fila.mes)}: ${fila.entradas} entradas y ${fila.salidas} salidas`}
                onPointerEnter={(e) => mostrar(e.currentTarget, fila)}
                onFocus={(e) => mostrar(e.currentTarget, fila)}
                onBlur={() => setTooltip(null)}
              >
                <div className="grafico-barras">
                  <span
                    className="columna serie-entradas"
                    style={{ height: `${(fila.entradas / maximo) * 100}%` }}
                  />
                  <span
                    className="columna serie-salidas"
                    style={{ height: `${(fila.salidas / maximo) * 100}%` }}
                  />
                </div>
                <span className="grafico-etiqueta">{nombreMes(fila.mes)}</span>
              </div>
            ))}
          </div>
          {tooltip && (
            <div className="tooltip-grafico" style={{ left: tooltip.x, top: tooltip.y }} role="status">
              <span className="tooltip-titulo">{tooltip.titulo}</span>
              {tooltip.filas.map((fila) => (
                <span key={fila.serie} className="tooltip-fila">
                  <span className={`tooltip-clave serie-${fila.serie}`} aria-hidden="true" />
                  <strong>{fila.texto}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BarrasHorizontales({
  titulo,
  detalle,
  filas,
  vacio,
}: {
  titulo: string;
  detalle: string;
  filas: { nombre: string; valor: number; texto: string }[];
  vacio: string;
}) {
  const maximo = Math.max(1, ...filas.map((fila) => fila.valor));
  return (
    <section className="tarjeta-reporte">
      <h3>{titulo}</h3>
      <p>{detalle}</p>
      {filas.length === 0 ? (
        <p className="aviso-vacio">{vacio}</p>
      ) : (
        <ul className="barras-horizontales">
          {filas.map((fila) => (
            <li key={fila.nombre} tabIndex={0} title={`${fila.nombre}: ${fila.texto}`}>
              <span className="barra-nombre">{fila.nombre}</span>
              <span className="barra-pista">
                <span className="barra-relleno" style={{ width: `${(fila.valor / maximo) * 100}%` }} />
              </span>
              <span className="barra-valor">{fila.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function InventarioReporte() {
  const { datos: reporte, cargando, error } = useCarga(obtenerReporte, REPORTE_VACIO, "No se pudo cargar el reporte");
  const { resumen } = reporte;

  const indicadores = [
    { valor: resumen.insumosActivos, texto: "Insumos activos", alerta: false },
    { valor: resumen.sinStock, texto: "Sin stock", alerta: resumen.sinStock > 0 },
    { valor: resumen.bajoMinimo, texto: "Bajo el mínimo", alerta: resumen.bajoMinimo > 0 },
    { valor: resumen.porVencer, texto: `Vencen en ${DIAS_AVISO_VENCIMIENTO} días o menos`, alerta: resumen.porVencer > 0 },
    { valor: resumen.vencidos, texto: "Lotes vencidos con stock", alerta: resumen.vencidos > 0 },
  ];

  const salidas = MOTIVOS_REPORTE.map((motivo) => ({
    nombre: ETIQUETAS_MOTIVO[motivo],
    valor: reporte.salidasPorMotivo[motivo] ?? 0,
  }))
    .filter((fila) => fila.valor > 0)
    .map((fila) => ({ ...fila, texto: `${fila.valor} ${fila.valor === 1 ? "salida" : "salidas"}` }));

  const donantes = reporte.donacionesPorDonante.map((fila) => ({
    nombre: fila.nombre,
    valor: fila.entregas,
    texto: `${fila.entregas} ${fila.entregas === 1 ? "entrega" : "entregas"}`,
  }));

  if (error) return <p className="login-error">{error}</p>;
  if (cargando) return <p className="aviso-vacio">Cargando reporte...</p>;

  return (
    <div className="reporte-inventario">
      <ul className="indicadores-inventario">
        {indicadores.map((indicador) => (
          <li key={indicador.texto} className={indicador.alerta ? "indicador-alerta" : ""}>
            <strong>{indicador.valor}</strong>
            <span>
              {indicador.alerta && (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3 2 21h20L12 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
                </svg>
              )}
              {indicador.texto}
            </span>
          </li>
        ))}
      </ul>

      <GraficoMovimientos datos={reporte.movimientosPorMes} />

      <div className="reporte-columnas">
        <BarrasHorizontales
          titulo="Salidas por motivo"
          detalle="Cuántas veces salió stock por cada razón"
          filas={salidas}
          vacio="Todavía no hay salidas registradas."
        />
        <BarrasHorizontales
          titulo="Principales donantes"
          detalle="Entregas de donaciones por donante"
          filas={donantes}
          vacio="Todavía no hay donaciones con donante registrado."
        />
      </div>

      <section className="tarjeta-reporte">
        <h3>Insumos más consumidos</h3>
        <p>Cantidad consumida en los últimos meses, cada uno en su unidad</p>
        {reporte.consumoPorInsumo.length === 0 ? (
          <p className="aviso-vacio">Todavía no hay consumo registrado.</p>
        ) : (
          <ol className="ranking-consumo">
            {reporte.consumoPorInsumo.map((fila) => (
              <li key={fila.nombre}>
                <span>{fila.nombre}</span>
                <strong>{formatearCantidad(fila.cantidad, fila.unidad)}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
