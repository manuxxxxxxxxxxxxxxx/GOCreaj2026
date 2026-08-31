import { useEffect, useState } from "react";
import { MapPin, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";
import { Sheet } from "../../ui/Sheet";
import { MapView } from "../../ui/MapView";

interface Props {
  enviando: boolean;
  onCancel: () => void;
  onConfirm: (lat: number, lng: number) => void;
}

/** Pide la ubicación, la muestra en el mapa y solo la envía si el usuario confirma. */
export function LocationPreviewSheet({ enviando, onCancel, onConfirm }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("No se pudo obtener tu ubicación. Revisa los permisos del navegador."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <Sheet open onClose={onCancel} title="Compartir ubicación">
      <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 14 }}>
        {error ? (
          <div style={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--surface-2)", padding: 20, textAlign: "center" }}>
            <WarningCircle size={24} color="var(--text-muted)" />
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{error}</p>
          </div>
        ) : !coords ? (
          <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)" }}>
            <span className="spinner" style={{ color: "var(--cyan)" }} />
          </div>
        ) : (
          <MapView
            markers={[{ id: "yo", lat: coords.lat, lng: coords.lng, color: "var(--cyan)", label: "Tu ubicación" }]}
            height={240}
            zoom={16}
            fitToMarkers={false}
            center={[coords.lng, coords.lat]}
            radius="0"
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "var(--text-secondary)" }}>
        <MapPin size={14} weight="fill" color="var(--cyan)" />
        <span style={{ fontSize: 12.5 }}>{coords ? "Esta es tu ubicación aproximada actual." : "Buscando tu ubicación…"}</span>
      </div>

      <button
        onClick={() => coords && onConfirm(coords.lat, coords.lng)}
        disabled={!coords || enviando}
        style={{
          width: "100%",
          height: 44,
          borderRadius: "var(--radius-md)",
          border: "none",
          background: "var(--cyan)",
          color: "var(--cyan-ink)",
          fontWeight: 700,
          fontSize: 13.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: coords ? "pointer" : "default",
          opacity: !coords || enviando ? 0.55 : 1,
        }}
      >
        {enviando ? <span className="spinner" /> : <PaperPlaneTilt size={16} weight="fill" />}
        Enviar esta ubicación
      </button>
    </Sheet>
  );
}
