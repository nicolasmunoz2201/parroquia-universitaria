import { MS_VIDA_ENLACE_ARCHIVO } from "../constants/archivos";

export async function abrirArchivo(cargar: () => Promise<Blob>) {
  const ventana = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await cargar());
    if (ventana) {
      ventana.location.href = url;
    } else {
      window.location.assign(url);
    }
    setTimeout(() => URL.revokeObjectURL(url), MS_VIDA_ENLACE_ARCHIVO);
  } catch (error) {
    ventana?.close();
    throw error;
  }
}
