export function calcularCuposDisponibles(cupos: number, ocupados: number) {
  return Math.max(cupos - ocupados, 0);
}

export function problemaConDocumentos(
  documentos: { tipoDocumento: string }[],
  requeridos: string[],
  exigirTodos: boolean
) {
  const tipos = documentos.map((documento) => documento.tipoDocumento);
  if (tipos.some((tipo) => !requeridos.includes(tipo))) {
    return "Uno de los documentos no corresponde a este sacramento";
  }
  if (new Set(tipos).size !== tipos.length) {
    return "Subiste dos archivos para el mismo documento";
  }
  if (exigirTodos) {
    const faltante = requeridos.find((requerido) => !tipos.includes(requerido));
    return faltante ? `Falta subir: ${faltante}` : null;
  }
  return tipos.length === 0 ? "Sube al menos un documento corregido" : null;
}
