import { useEffect, useRef, useState } from "react";
import { Check, X } from "@phosphor-icons/react";

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HANDLE = 16;
const MIN_SIZE = 40;

type Drag = { mode: "move" | "nw" | "ne" | "sw" | "se"; startX: number; startY: number; startRect: Rect };

/** Recorte libre (sin proporción fija) sobre canvas, sin depender de ninguna librería externa
 * -- no había ninguna en el repo (ver investigación de chat/productos), así que se construye
 * desde cero con pointer events (funciona igual con mouse y touch). */
export function ImageCropModal({ file, onCancel, onConfirm }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [procesando, setProcesando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Creado y revocado dentro del MISMO efecto -- ver nota en AttachmentPreviewSheet.tsx
  // sobre por qué useState/useMemo + revoke en un efecto aparte se rompe bajo StrictMode.
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    const w = img.clientWidth;
    const h = img.clientHeight;
    setDisplay({ w, h });
    const rw = w * 0.8;
    const rh = h * 0.8;
    setRect({ x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh });
  };

  const clamp = (r: Rect): Rect => {
    let { x, y, w, h } = r;
    w = Math.max(MIN_SIZE, Math.min(w, display.w));
    h = Math.max(MIN_SIZE, Math.min(h, display.h));
    x = Math.max(0, Math.min(x, display.w - w));
    y = Math.max(0, Math.min(y, display.h - h));
    return { x, y, w, h };
  };

  const onPointerDown = (mode: Drag["mode"]) => (e: React.PointerEvent) => {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ mode, startX: e.clientX, startY: e.clientY, startRect: rect });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const s = drag.startRect;
    let next: Rect = s;
    if (drag.mode === "move") next = { ...s, x: s.x + dx, y: s.y + dy };
    else if (drag.mode === "se") next = { x: s.x, y: s.y, w: s.w + dx, h: s.h + dy };
    else if (drag.mode === "sw") next = { x: s.x + dx, y: s.y, w: s.w - dx, h: s.h + dy };
    else if (drag.mode === "ne") next = { x: s.x, y: s.y + dy, w: s.w + dx, h: s.h - dy };
    else if (drag.mode === "nw") next = { x: s.x + dx, y: s.y + dy, w: s.w - dx, h: s.h - dy };
    setRect(clamp(next));
  };

  const endDrag = () => setDrag(null);

  const confirmar = async () => {
    if (!rect || !natural.w || !url) return;
    setProcesando(true);
    const scaleX = natural.w / display.w;
    const scaleY = natural.h / display.h;
    const sx = rect.x * scaleX;
    const sy = rect.y * scaleY;
    const sw = rect.w * scaleX;
    const sh = rect.h * scaleY;

    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return setProcesando(false);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        setProcesando(false);
        if (!blob) return;
        onConfirm(new File([blob], file.name, { type: mime }));
      },
      mime,
      0.9
    );
  };

  if (!url) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 480, marginBottom: 14 }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Recortar foto</span>
        <button onClick={onCancel} aria-label="Cancelar" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
          <X size={20} />
        </button>
      </div>

      <div ref={containerRef} style={{ position: "relative", maxWidth: 480, maxHeight: "60vh", userSelect: "none", touchAction: "none" }}>
        <img src={url} alt="" onLoad={onImgLoad} draggable={false} style={{ display: "block", maxWidth: 480, maxHeight: "60vh", objectFit: "contain" }} />
        {rect && (
          <>
            <svg width={display.w} height={display.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <defs>
                <mask id="cropmask">
                  <rect x={0} y={0} width={display.w} height={display.h} fill="#fff" />
                  <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="#000" />
                </mask>
              </defs>
              <rect x={0} y={0} width={display.w} height={display.h} fill="rgba(0,0,0,0.55)" mask="url(#cropmask)" />
            </svg>
            <div
              onPointerDown={onPointerDown("move")}
              style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid var(--cyan)", cursor: "move", boxSizing: "border-box" }}
            >
              {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={onPointerDown(corner)}
                  style={{
                    position: "absolute",
                    width: HANDLE,
                    height: HANDLE,
                    borderRadius: "50%",
                    background: "var(--cyan)",
                    border: "2px solid #fff",
                    cursor: `${corner}-resize`,
                    top: corner.includes("n") ? -HANDLE / 2 : undefined,
                    bottom: corner.includes("s") ? -HANDLE / 2 : undefined,
                    left: corner.includes("w") ? -HANDLE / 2 : undefined,
                    right: corner.includes("e") ? -HANDLE / 2 : undefined,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={confirmar}
        disabled={procesando || !rect}
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 28px",
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--cyan)",
          color: "var(--cyan-ink)",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          opacity: procesando ? 0.6 : 1,
        }}
      >
        {procesando ? <span className="spinner" /> : <Check size={17} weight="bold" />}
        Listo
      </button>
    </div>
  );
}
