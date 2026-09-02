import { useRef, useState } from "react";
import { Hash, PencilSimple, Trash, VideoCamera } from "@phosphor-icons/react";
import { Sheet } from "../ui/Sheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { PriceInput } from "../ui/PriceInput";
import { vendedorApi, ApiError } from "../../lib/api";
import { fileToBase64 } from "../../lib/format";
import { CategoryPicker } from "./CategoryPicker";
import { useToast } from "../../context/ToastContext";

interface Props {
  onClose: () => void;
  onPublicado: () => void;
}

/** Sheet dedicado para publicar un Reel con video real -- separado del formulario normal de
 * producto (que solo reutiliza la foto), porque acá el video es el contenido principal. */
export function SubirReelSheet({ onClose, onPublicado }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<{ file: File; preview: string } | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState(0);
  const [stock, setStock] = useState("0");
  const [categoria, setCategoria] = useState("comida");
  const [hashtags, setHashtags] = useState("");
  const [publicando, setPublicando] = useState(false);

  const elegirVideo = (f: File | undefined) => {
    if (!f) return;
    setVideo({ file: f, preview: URL.createObjectURL(f) });
  };

  const publicar = async () => {
    if (!video) return toast.show("Elige un video para el reel.", "warning");
    if (!nombre.trim() || !precio) return toast.show("Nombre y precio son obligatorios.", "warning");
    setPublicando(true);
    try {
      const tiendas = await vendedorApi.misTiendas();
      const tiendaId = tiendas.tiendas[0]?.id;
      if (!tiendaId) return toast.show("Primero crea tu tienda.", "warning");
      const videoBase64 = await fileToBase64(video.file);
      await vendedorApi.crearProducto({
        tienda_id: tiendaId,
        nombre,
        descripcion,
        precio,
        stock: Number(stock),
        categoria,
        video: videoBase64,
        es_reel: true,
        hashtags: hashtags.trim() || undefined,
      });
      toast.show("Reel publicado", "success");
      onPublicado();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo publicar el reel.", "error");
    } finally {
      setPublicando(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Nuevo Reel" maxWidth={560}>
      <div style={{ display: "flex", gap: 18 }}>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => elegirVideo(e.target.files?.[0])} />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              width: 150,
              height: 260,
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-strong)",
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              padding: 0,
            }}
          >
            {video ? (
              <video src={video.preview} muted loop autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
                <VideoCamera size={28} />
                <span style={{ fontSize: 12.5 }}>Elegir video</span>
                <span style={{ fontSize: 10.5, opacity: 0.75 }}>Vertical, se ve mejor</span>
              </div>
            )}
          </button>
          {video && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "var(--radius-pill)", padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                <PencilSimple size={11} /> Cambiar
              </button>
              <button
                type="button"
                aria-label="Quitar video"
                onClick={() => setVideo(null)}
                style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Trash size={13} />
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionLabel>Producto</SectionLabel>
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "10px 14px", fontSize: 15, fontFamily: "inherit", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <PriceInput label="Precio" value={precio} onChange={setPrecio} />
            </div>
            <Input label="Stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <SectionLabel>Categoría</SectionLabel>
        <div style={{ marginBottom: 20 }}>
          <CategoryPicker value={categoria} onChange={setCategoria} />
        </div>

        <SectionLabel>Hashtags</SectionLabel>
        <Input
          label="Etiquetas"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="comida salvador oferta"
          icon={<Hash size={16} />}
          hint="Sepáralos con espacios — se muestran como #comida #salvador #oferta"
        />
      </div>

      <Button size="lg" onClick={publicar} loading={publicando} style={{ width: "100%", marginTop: 22 }}>
        Publicar Reel
      </Button>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{children}</div>;
}
