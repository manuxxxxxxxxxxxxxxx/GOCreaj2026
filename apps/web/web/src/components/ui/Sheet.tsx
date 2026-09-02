import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
}

export function Sheet({ open, onClose, title, children, maxWidth = 480 }: Props) {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const endDrag = () => {
    dragging.current = false;
    if (dragY > 90) onClose();
    setDragY(0);
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-sheet)" as unknown as number,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4, 8, 16, 0.55)",
          animation: "fade-in var(--dur-base) var(--ease-out) both",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          maxHeight: "88vh",
          background: "var(--surface-1)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          // Solo permite el gesto táctil vertical (scroll/arrastrar para cerrar) -- sin esto
          // un swipe horizontal sobre el formulario lo interpreta el navegador como gesto de
          // "volver atrás" en vez de quedarse dentro del sheet.
          touchAction: "pan-y",
          transform: `translateY(${dragY}px)`,
          transition: dragging.current ? "none" : "transform var(--dur-base) var(--ease-spring)",
          animation: dragY === 0 ? "sheet-in var(--dur-base) var(--ease-out) both" : undefined,
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", touchAction: "none", cursor: "grab" }}
        >
          <span aria-hidden="true" style={{ width: 36, height: 4, borderRadius: "var(--radius-pill)", background: "var(--border-strong)" }} />
        </div>
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
            <h2 style={{ fontSize: 17 }}>{title}</h2>
            <button
              aria-label="Cerrar"
              onClick={onClose}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ overflowY: "auto", overflowX: "hidden", padding: "0 20px 24px" }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
