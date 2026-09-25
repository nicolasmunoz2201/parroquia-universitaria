import { useState } from "react";

interface Props {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
}

export default function CampoPassword({ id, value, onChange, minLength, required, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="campo-password">
      <input
        id={id}
        className="campo-password-input"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="boton-ver-password"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          {visible && (
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  );
}
