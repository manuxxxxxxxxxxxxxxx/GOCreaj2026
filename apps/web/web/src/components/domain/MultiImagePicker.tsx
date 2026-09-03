import { useRef, useState } from "react";
import { Camera, Plus, X } from "@phosphor-icons/react";
import { fileToBase64 } from "../../lib/format";
import { ImageLightbox } from "../ui/ImageLightbox";

const MAX_IMAGENES = 10;

/** Galería de hasta 10 fotos para el formulario de producto (antes una sola). Click en una
 * foto la abre en grande (lightbox) sin disparar el selector de archivo ni quitarla. */
export function MultiImagePicker({ imagenes, onChange }: { imagenes: string[]; onChange: (imagenes: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [verGrande, setVerGrande] = useState<number | null>(null);
  const cupoRestante = MAX_IMAGENES - imagenes.length;

  const agregar = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const nuevas = await Promise.all(Array.from(files).slice(0, cupoRestante).map(fileToBase64));
    onChange([...imagenes, ...nuevas].slice(0, MAX_IMAGENES));
  };

  const quitar = (i: number) => onChange(imagenes.filter((_, idx) => idx !== i));

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {imagenes.map((uri, i) => (
          <div key={i} style={{ position: "relative", width: 78, height: 78, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setVerGrande(i)}
              aria-label="Ver foto en grande"
              style={{ display: "block", width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in" }}
            >
              <img src={uri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
            {i === 0 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", padding: "2px 0", background: "var(--cyan)", pointerEvents: "none" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan-ink)" }}>Portada</span>
              </div>
            )}
            <button
              onClick={() => quitar(i)}
              aria-label="Quitar foto"
              style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {cupoRestante > 0 && (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: 78,
              height: 78,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            {imagenes.length === 0 ? <Camera size={20} /> : <Plus size={20} />}
            <span style={{ fontSize: 10.5, marginTop: 3 }}>{imagenes.length === 0 ? "Agregar fotos" : `${imagenes.length}/${MAX_IMAGENES}`}</span>
          </button>
        )}
      </div>
      {imagenes.length > 0 && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>La primera foto es la portada. Haz clic en una foto para verla en grande, o en la X para quitarla.</p>}
      {verGrande !== null && (
        <ImageLightbox images={imagenes} index={verGrande} onIndexChange={setVerGrande} onClose={() => setVerGrande(null)} />
      )}
    </div>
  );
}
