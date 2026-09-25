import { useEffect, useRef } from "react";

interface Props {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmarAccion({
  titulo,
  mensaje,
  textoConfirmar,
  peligro = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const dialogoRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  return (
    <dialog ref={dialogoRef} className="dialogo-confirmacion" onCancel={onCancelar}>
      <h2>{titulo}</h2>
      <p>{mensaje}</p>
      <div className="dialogo-acciones">
        <button type="button" className="dialogo-cancelar" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className={peligro ? "dialogo-eliminar" : "dialogo-confirmar"}
          onClick={onConfirmar}
        >
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}
