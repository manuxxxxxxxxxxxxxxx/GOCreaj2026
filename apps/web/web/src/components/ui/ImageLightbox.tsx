import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

interface Props {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}

/** Visor de imagen en grande: click en una miniatura la abre a pantalla completa, con
 * Escape/click-fuera/botón X para cerrar y flechas para navegar cuando hay más de una. */
export function ImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && onIndexChange && images.length > 1) onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft" && onIndexChange && images.length > 1) onIndexChange((index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onIndexChange, index, images.length]);

  const src = images[index];
  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto en grande"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-sheet)" as unknown as number,
        background: "rgba(4, 8, 16, 0.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fade-in var(--dur-base) var(--ease-out) both",
        padding: 24,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
      >
        <X size={18} />
      </button>

      {images.length > 1 && onIndexChange && (
        <>
          <button
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            aria-label="Foto siguiente"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </>
      )}

      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "min(92vw, 900px)", maxHeight: "88vh", objectFit: "contain", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }}
      />

      {images.length > 1 && (
        <span
          className="tabular"
          style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", fontSize: 12.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.45)", padding: "5px 12px", borderRadius: "var(--radius-pill)" }}
        >
          {index + 1} / {images.length}
        </span>
      )}
    </div>,
    document.body,
  );
}
