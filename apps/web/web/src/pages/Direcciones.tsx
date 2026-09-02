import { useEffect, useState } from "react";
import { Crosshair, MapPin, PencilSimple, Plus, Star, Trash } from "@phosphor-icons/react";
import { direccionesApi, ApiError } from "../lib/api";
import type { DireccionUsuario } from "../lib/types";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { BackButton } from "../components/ui/BackButton";
import { MapView } from "../components/ui/MapView";

const EL_SALVADOR_CENTER: [number, number] = [-89.2182, 13.6929];

/** Geocodificación inversa vía Nominatim (OpenStreetMap) — mismos tiles que ya usa el mapa de la app, sin API key. */
async function geocodificarInverso(lat: number, lng: number) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo geocodificar.");
  const data = await res.json();
  const a = data.address ?? {};
  const calle = [a.road, a.house_number].filter(Boolean).join(" ");
  const barrio = a.neighbourhood || a.suburb || a.quarter;
  const direccion = [calle, barrio].filter(Boolean).join(", ") || data.display_name || "";
  const municipio = a.city || a.town || a.village || a.municipality || "";
  const departamento = a.state || a.county || "";
  return { direccion, municipio, departamento };
}

export function Direcciones() {
  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<DireccionUsuario | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const toast = useToast();

  const cargar = () => {
    direccionesApi.listar().then((r) => setDirecciones(r.direcciones)).catch(() => setDirecciones([]));
  };

  useEffect(cargar, []);

  const abrirNueva = () => {
    setEditando(null);
    setFormOpen(true);
  };
  const abrirEditar = (d: DireccionUsuario) => {
    setEditando(d);
    setFormOpen(true);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton />
          <h1 style={{ fontSize: 22 }}>Direcciones</h1>
        </div>
        <Button size="sm" onClick={abrirNueva}>
          <Plus size={15} /> Nueva
        </Button>
      </div>

      {direcciones === null ? (
        <Skeleton height={100} />
      ) : direcciones.length === 0 ? (
        <EmptyState icon={<MapPin size={24} />} title="Sin direcciones guardadas" actionLabel="Agregar dirección" onAction={abrirNueva} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {direcciones.map((d) => (
            <div key={d.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border)" }}>
              <MapPin size={18} color="var(--cyan)" style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{d.alias}</span>
                  {!!d.es_principal && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--cyan)" }}>
                      <Star size={11} weight="fill" /> Principal
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                  {d.direccion}, {d.municipio}
                </div>
                {d.referencia && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{d.referencia}</div>}
                {!d.es_principal && (
                  <button
                    onClick={() => direccionesApi.marcarPrincipal(d.id).then(cargar)}
                    style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Marcar como principal
                  </button>
                )}
              </div>
              <button onClick={() => abrirEditar(d)} aria-label="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <PencilSimple size={16} />
              </button>
              <button onClick={() => setEliminando(d.id)} aria-label="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <DireccionForm
        open={formOpen}
        editando={editando}
        totalActual={direcciones?.length ?? 0}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          cargar();
        }}
      />

      <ConfirmDialog
        open={eliminando !== null}
        title="¿Eliminar dirección?"
        description="No podrás deshacer esta acción."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (eliminando === null) return;
          try {
            await direccionesApi.eliminar(eliminando);
            setEliminando(null);
            cargar();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
          }
        }}
      />
    </div>
  );
}

function DireccionForm({
  open,
  editando,
  totalActual,
  onClose,
  onSaved,
}: {
  open: boolean;
  editando: DireccionUsuario | null;
  totalActual: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [alias, setAlias] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [departamento, setDepartamento] = useState("San Salvador");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const toast = useToast();

  // Repuebla el formulario cada vez que se abre: datos de la dirección a editar, o vacío para una nueva.
  useEffect(() => {
    if (!open) return;
    if (editando) {
      setAlias(editando.alias);
      setMunicipio(editando.municipio);
      setDepartamento(editando.departamento || "San Salvador");
      setDireccion(editando.direccion);
      setReferencia(editando.referencia ?? "");
      setEsPrincipal(!!editando.es_principal);
      setPin(editando.lat != null && editando.lng != null ? { lat: editando.lat, lng: editando.lng } : null);
    } else {
      setAlias("");
      setMunicipio("");
      setDepartamento("San Salvador");
      setDireccion("");
      setReferencia("");
      setEsPrincipal(false);
      setPin(null);
    }
  }, [open, editando]);

  const elegirEnMapa = async (coords: { lat: number; lng: number }) => {
    setPin(coords);
    setUbicando(true);
    try {
      const r = await geocodificarInverso(coords.lat, coords.lng);
      if (r.direccion) setDireccion(r.direccion);
      if (r.municipio) setMunicipio(r.municipio);
      if (r.departamento) setDepartamento(r.departamento);
      toast.show("Ubicación detectada", "success");
    } catch {
      toast.show("No se pudo detectar la calle — puedes escribirla manualmente.", "warning");
    } finally {
      setUbicando(false);
    }
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) return toast.show("Tu navegador no soporta geolocalización.", "error");
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => elegirEnMapa({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setUbicando(false);
        toast.show("No se pudo obtener tu ubicación. Revisa los permisos del navegador.", "error");
      },
    );
  };

  const guardar = async () => {
    if (!municipio.trim() || !direccion.trim()) return toast.show("Completa municipio y dirección.", "warning");
    const aliasFinal = alias.trim() || (editando ? editando.alias : `Ubicación ${totalActual + 1}`);
    setGuardando(true);
    try {
      if (editando) {
        await direccionesApi.actualizar({
          id: editando.id,
          alias: aliasFinal,
          municipio,
          direccion,
          referencia: referencia || null,
          departamento,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
          es_principal: esPrincipal ? 1 : 0,
        });
        toast.show("Dirección actualizada", "success");
      } else {
        await direccionesApi.crear({
          alias: aliasFinal,
          municipio,
          direccion,
          referencia: referencia || null,
          departamento,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
          es_principal: esPrincipal ? 1 : 0,
        });
        toast.show("Dirección guardada", "success");
      }
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={editando ? "Editar dirección" : "Nueva dirección"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Toca el mapa para ubicar tu dirección</label>
            <button
              onClick={usarUbicacionActual}
              disabled={ubicando}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--cyan)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              <Crosshair size={13} /> Mi ubicación
            </button>
          </div>
          <MapView
            markers={pin ? [{ id: "pin", lat: pin.lat, lng: pin.lng, color: "#38D6FF" }] : []}
            center={pin ? [pin.lng, pin.lat] : EL_SALVADOR_CENTER}
            zoom={pin ? 16 : 12}
            fitToMarkers={false}
            height={200}
            onMapClick={elegirEnMapa}
          />
          {ubicando && <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>Detectando la calle…</p>}
        </div>

        <Input
          label="Alias"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder={editando ? "Casa, Trabajo…" : `Casa, Trabajo… (vacío = Ubicación ${totalActual + 1})`}
        />
        <Input label="Municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="San Salvador" />
        <Input label="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, avenida, número" />
        <Input label="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Casa color celeste, portón negro" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} /> Usar como dirección principal
        </label>
        <Button fullWidth onClick={guardar} loading={guardando}>
          {editando ? "Guardar cambios" : "Guardar dirección"}
        </Button>
      </div>
    </Sheet>
  );
}
