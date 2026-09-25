import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  crearPublicacion,
  actualizarPublicacion,
  eliminarPublicacion,
} from "../services/publicacion.service";
import type { Publicacion } from "../services/publicacion.service";
import type { Usuario } from "../services/auth.service";
import { usePublicaciones } from "../hooks/usePublicaciones";
import { useOrganismos } from "../hooks/useOrganismos";
import { useToast } from "../context/ToastContext";
import ConfirmarAccion from "./ConfirmarAccion";

const MAX_FOTOS = 3;
const MAX_TAMANO_FOTO_MB = 5;

interface ImagenSeleccionada {
  archivo: File;
  vistaPrevia: string;
}

interface Props {
  usuario: Usuario;
}

export default function DashboardPublicaciones({ usuario }: Props) {
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const { mostrarToast } = useToast();

  const {
    publicaciones,
    error: errorCarga,
    recargar: recargarPublicaciones,
  } = usePublicaciones();
  const { organismos } = useOrganismos({ soloActivos: true });

  const [editando, setEditando] = useState<Publicacion | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [organismoId, setOrganismoId] = useState(usuario.organismoId ?? "");
  const [imagenes, setImagenes] = useState<ImagenSeleccionada[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");
  const [porEliminar, setPorEliminar] = useState<Publicacion | null>(null);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  const publicacionesGestionables = publicaciones.filter(
    (pub) => esAdmin || pub.organismo.id === usuario.organismoId
  );

  function handleQuitarImagenes() {
    imagenes.forEach((imagen) => URL.revokeObjectURL(imagen.vistaPrevia));
    setImagenes([]);
    if (inputImagenRef.current) {
      inputImagenRef.current.value = "";
    }
  }

  function handleQuitarImagen(indice: number) {
    URL.revokeObjectURL(imagenes[indice].vistaPrevia);
    setImagenes(imagenes.filter((_, i) => i !== indice));
  }

  function handleImagenesChange(e: ChangeEvent<HTMLInputElement>) {
    const nuevosArchivos = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (imagenes.length + nuevosArchivos.length > MAX_FOTOS) {
      setError(`Puedes subir hasta ${MAX_FOTOS} fotos por publicacion`);
      return;
    }

    const fotoPesada = nuevosArchivos.find(
      (archivo) => archivo.size > MAX_TAMANO_FOTO_MB * 1024 * 1024
    );
    if (fotoPesada) {
      setError(`"${fotoPesada.name}" pesa mas de ${MAX_TAMANO_FOTO_MB} MB`);
      return;
    }

    setError("");
    const nuevas = nuevosArchivos.map((archivo) => ({
      archivo,
      vistaPrevia: URL.createObjectURL(archivo),
    }));
    setImagenes([...imagenes, ...nuevas]);
  }

  function handleEditar(pub: Publicacion) {
    setEditando(pub);
    setTitulo(pub.titulo);
    setContenido(pub.contenido);
    setOrganismoId(pub.organismo.id);
    handleQuitarImagenes();
    setError("");
  }

  function handleCancelarEdicion() {
    setEditando(null);
    setTitulo("");
    setContenido("");
    setOrganismoId(usuario.organismoId ?? "");
    handleQuitarImagenes();
    setError("");
  }

  const organismoDestino = esAdmin ? organismoId : usuario.organismoId;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!editando && !organismoDestino) {
      setError("Selecciona un organismo");
      return;
    }

    setConfirmandoEnvio(true);
  }

  async function enviarPublicacion() {
    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("contenido", contenido);
    imagenes.forEach((imagen) => formData.append("imagenes", imagen.archivo));
    if (!editando && organismoDestino) {
      formData.append("organismoId", organismoDestino);
    }

    setEnviando(true);
    try {
      if (editando) {
        await actualizarPublicacion(editando.id, formData);
        mostrarToast("Publicacion actualizada con exito");
      } else {
        await crearPublicacion(formData);
        mostrarToast("Publicacion creada con exito");
      }
      setEditando(null);
      setTitulo("");
      setContenido("");
      handleQuitarImagenes();
      await recargarPublicaciones();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al guardar la publicacion";
      setError(mensaje);
      mostrarToast(mensaje, "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleEliminar(id: string) {
    setErrorEliminar("");
    try {
      await eliminarPublicacion(id);
      if (editando?.id === id) handleCancelarEdicion();
      mostrarToast("Publicacion eliminada con exito");
      await recargarPublicaciones();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo eliminar la publicacion";
      setErrorEliminar(mensaje);
      mostrarToast(mensaje, "error");
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Gestionar publicaciones</h1>

      {errorCarga && <p className="login-error">{errorCarga}</p>}

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>{editando ? "Editar publicacion" : "Nueva publicacion"}</h2>

        <label htmlFor="titulo">Titulo</label>
        <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

        <label htmlFor="contenido">Descripcion</label>
        <textarea
          id="contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          required
        />

        {esAdmin &&
          (editando ? (
            <p className="organismo-fijo">Organismo: {editando.organismo.nombre}</p>
          ) : (
            <>
              <label htmlFor="organismo">Organismo</label>
              <select
                id="organismo"
                value={organismoId}
                onChange={(e) => setOrganismoId(e.target.value)}
                required
              >
                <option value="">Selecciona un organismo</option>
                {organismos.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.nombre}
                  </option>
                ))}
              </select>
            </>
          ))}

        <label htmlFor="imagen">Fotos (maximo {MAX_FOTOS})</label>
        {editando && (
          <p className="imagenes-actuales-hint">
            {editando.imagenes.length > 0
              ? `Esta publicacion ya tiene ${editando.imagenes.length} foto(s). Sube fotos nuevas para reemplazarlas, o deja esto vacio para conservar las actuales.`
              : "Esta publicacion no tiene fotos todavia."}
          </p>
        )}
        <input
          id="imagen"
          className="input-archivo-oculto"
          ref={inputImagenRef}
          type="file"
          accept="image/*"
          multiple
          disabled={imagenes.length >= MAX_FOTOS}
          onChange={handleImagenesChange}
        />
        <label
          htmlFor="imagen"
          className={`selector-fotos ${imagenes.length >= MAX_FOTOS ? "selector-fotos-lleno" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="9" cy="10" r="1.6" fill="currentColor" />
            <path d="M4 17l5-5 4 4 2.5-2.5L20 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span className="selector-fotos-texto">
            {imagenes.length >= MAX_FOTOS
              ? "Llegaste al máximo de fotos"
              : imagenes.length > 0
                ? "Agregar más fotos"
                : "Elegir fotos"}
          </span>
          <span className="selector-fotos-ayuda">
            {imagenes.length} de {MAX_FOTOS} fotos · máximo {MAX_TAMANO_FOTO_MB} MB cada una
          </span>
        </label>

        {imagenes.length > 0 && (
          <>
            <ul className="imagenes-preview">
              {imagenes.map(({ archivo, vistaPrevia }, indice) => (
                <li key={vistaPrevia}>
                  <img src={vistaPrevia} alt={archivo.name} />
                  <span>{archivo.name}</span>
                  <button
                    type="button"
                    aria-label={`Quitar ${archivo.name}`}
                    onClick={() => handleQuitarImagen(indice)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="boton-quitar-imagen" onClick={handleQuitarImagenes}>
              Quitar todas las fotos
            </button>
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <div className="acciones-formulario">
          <button type="submit" disabled={enviando}>
            {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Publicar"}
          </button>
          {editando && (
            <button type="button" className="boton-secundario" onClick={handleCancelarEdicion}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {errorEliminar && <p className="login-error">{errorEliminar}</p>}

      <ul className="publicaciones-lista">
        {publicacionesGestionables.map((pub) => (
          <li key={pub.id}>
            <span>
              <strong>{pub.titulo}</strong> — {pub.organismo.nombre}
            </span>
            <span className="acciones-organismo">
              <button onClick={() => handleEditar(pub)}>Editar</button>
              <button onClick={() => setPorEliminar(pub)}>Eliminar</button>
            </span>
          </li>
        ))}
        {publicacionesGestionables.length === 0 && <li>No hay publicaciones todavia.</li>}
      </ul>

      {confirmandoEnvio && (
        <ConfirmarAccion
          titulo={editando ? "Guardar cambios" : "Publicar"}
          mensaje={
            editando
              ? `¿Guardar los cambios de "${titulo.trim()}"?`
              : `¿Publicar "${titulo.trim()}"${
                  imagenes.length > 0 ? ` con ${imagenes.length} foto(s)` : " sin fotos"
                }?`
          }
          textoConfirmar={editando ? "Guardar" : "Publicar"}
          onConfirmar={() => {
            setConfirmandoEnvio(false);
            enviarPublicacion();
          }}
          onCancelar={() => setConfirmandoEnvio(false)}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo="Eliminar publicacion"
          mensaje={`¿Seguro que quieres eliminar "${porEliminar.titulo}"? Esta accion no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => {
            setPorEliminar(null);
            handleEliminar(porEliminar.id);
          }}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </div>
  );
}
