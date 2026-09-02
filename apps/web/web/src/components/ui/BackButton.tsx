import { useNavigate } from "react-router-dom";
import { CaretLeft } from "@phosphor-icons/react";

interface Props {
  /** Ruta a la que ir. Si se omite, retrocede en el historial (equivalente a el botón "atrás" del navegador). */
  to?: string;
  label?: string;
}

/** Botón circular de "volver" reutilizado en las pantallas a las que se llega desde un enlace (soporte, direcciones, billetera, configuración…). */
export function BackButton({ to, label = "Volver" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label={label}
      title={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <CaretLeft size={16} />
    </button>
  );
}
