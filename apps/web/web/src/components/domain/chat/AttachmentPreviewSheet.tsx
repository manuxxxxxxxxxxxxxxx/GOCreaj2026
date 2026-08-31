import { useEffect, useMemo, useState } from "react";
import { FilePdf, PaperPlaneTilt, Trash } from "@phosphor-icons/react";
import { Sheet } from "../../ui/Sheet";

interface Props {
  file: File;
  kind: "imagen" | "video" | "pdf";
  enviando: boolean;
  onCancel: () => void;
  onConfirm: (caption: string) => void;
}

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Confirmación previa a enviar un adjunto: nada sale del composer sin que el usuario vea y apruebe la vista previa. */
export function AttachmentPreviewSheet({ file, kind, enviando, onCancel, onConfirm }: Props) {
  const [caption, setCaption] = useState("");
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const titulo = kind === "imagen" ? "Enviar foto" : kind === "video" ? "Enviar video" : "Enviar documento";

  return (
    <Sheet open onClose={onCancel} title={titulo}>
      <div
        style={{
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--surface-2)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: kind === "pdf" ? 96 : 220,
          maxHeight: 360,
        }}
      >
        {kind === "imagen" && <img src={url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "contain" }} />}
        {kind === "video" && <video src={url} controls style={{ width: "100%", maxHeight: 360 }} />}
        {kind === "pdf" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 18, width: "100%" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", background: "var(--danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FilePdf size={24} weight="fill" color="var(--danger)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{tamanoLegible(file.size)}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          disabled={enviando}
          aria-label="Descartar"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Trash size={18} />
        </button>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !enviando && onConfirm(caption.trim())}
          placeholder="Agrega un mensaje (opcional)…"
          style={{ flex: 1, height: 44, borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", padding: "0 16px", fontSize: 13.5 }}
        />
        <button
          onClick={() => onConfirm(caption.trim())}
          disabled={enviando}
          aria-label="Enviar"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: "var(--cyan)",
            color: "var(--cyan-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: enviando ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {enviando ? <span className="spinner" /> : <PaperPlaneTilt size={18} weight="fill" />}
        </button>
      </div>
    </Sheet>
  );
}
