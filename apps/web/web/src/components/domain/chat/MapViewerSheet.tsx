import { ArrowSquareOut, MapPin } from "@phosphor-icons/react";
import { Sheet } from "../../ui/Sheet";
import { MapView } from "../../ui/MapView";

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

/** Abre la ubicación compartida en un mapa grande dentro de la app, sin salir a una pestaña externa. */
export function MapViewerSheet({ lat, lng, onClose }: Props) {
  return (
    <Sheet open onClose={onClose} title="Ubicación compartida" maxWidth={560}>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <MapView markers={[{ id: "u", lat, lng, color: "var(--coral)", label: "Ubicación compartida" }]} height={420} zoom={16} fitToMarkers={false} center={[lng, lat]} radius="0" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
          <MapPin size={14} weight="fill" color="var(--coral)" />
          <span className="tabular">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}
        >
          Abrir en Google Maps <ArrowSquareOut size={13} />
        </a>
      </div>
    </Sheet>
  );
}
