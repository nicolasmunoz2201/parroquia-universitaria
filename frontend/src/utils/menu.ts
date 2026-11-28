import type { Usuario } from "../services/auth.service";
import { ROLES_GESTION_SACRAMENTOS } from "../constants/sacramentos";
import { ROLES_INVENTARIO } from "../constants/inventario";
import { ROLES_GESTION_ACTIVIDADES } from "../constants/actividades";

export type Vista =
  | "inicio"
  | "actividades"
  | "gestion-actividades"
  | "memoria"
  | "gestion-memoria"
  | "login"
  | "perfil"
  | "gestion"
  | "organismos"
  | "usuarios"
  | "sacramentos"
  | "agendamientos"
  | "inventario";

export interface OpcionMenu {
  vista: Vista;
  texto: string;
}

export interface GrupoMenu {
  id: string;
  titulo: string;
  opciones: OpcionMenu[];
}

export function puedeGestionarPublicaciones(usuario: Usuario | null) {
  return usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ENCARGADO_ORGANISMO";
}

export function construirMenu(usuario: Usuario | null): GrupoMenu[] {
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const tieneRol = (roles: string[]) => !!usuario && roles.includes(usuario.rol);

  const gestion: OpcionMenu[] = [
    ...(tieneRol(ROLES_GESTION_SACRAMENTOS) ? [{ vista: "agendamientos" as const, texto: "Agendamientos" }] : []),
    ...(tieneRol(ROLES_GESTION_ACTIVIDADES) ? [{ vista: "gestion-actividades" as const, texto: "Actividades" }] : []),
    ...(puedeGestionarPublicaciones(usuario) ? [{ vista: "gestion" as const, texto: "Publicaciones" }] : []),
    ...(esAdmin ? [{ vista: "gestion-memoria" as const, texto: "Memoria histórica" }] : []),
    ...(tieneRol(ROLES_INVENTARIO) ? [{ vista: "inventario" as const, texto: "Inventario del comedor" }] : []),
    ...(esAdmin
      ? [
          { vista: "organismos" as const, texto: "Organismos" },
          { vista: "usuarios" as const, texto: "Usuarios" },
        ]
      : []),
  ];

  const grupos: GrupoMenu[] = [
    {
      id: "parroquia",
      titulo: "Parroquia",
      opciones: [
        { vista: "actividades", texto: "Actividades" },
        { vista: "memoria", texto: "Memoria histórica" },
      ],
    },
    {
      id: "tramites",
      titulo: "Mis trámites",
      opciones: usuario ? [{ vista: "sacramentos", texto: "Agendar sacramentos" }] : [],
    },
    { id: "gestion", titulo: "Gestión", opciones: gestion },
  ];

  return grupos.filter((grupo) => grupo.opciones.length > 0);
}
