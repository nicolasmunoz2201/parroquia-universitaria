import { listarUsuarios } from "../services/usuario.service";
import type { UsuarioAdmin } from "../services/usuario.service";
import { useCarga } from "./useCarga";

const SIN_USUARIOS: UsuarioAdmin[] = [];

export function useUsuarios() {
  const { datos: usuarios, cargando, error, recargar } = useCarga(
    listarUsuarios,
    SIN_USUARIOS,
    "Error al cargar los usuarios"
  );
  return { usuarios, cargando, error, recargar };
}
