import { useEffect, useState } from "react";
import { MapPin, Plus, Star, Trash } from "@phosphor-icons/react";
import { direccionesApi, ApiError } from "../lib/api";
import type { DireccionUsuario } from "../lib/types";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function Direcciones() {
  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const toast = useToast();

  const cargar = () => {
    direccionesApi.listar().then((r) => setDirecciones(r.direcciones)).catch(() => setDirecciones([]));
  };

  useEffect(cargar, []);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22 }}>Direcciones</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Nueva
        </Button>
      </div>

      {direcciones === null ? (
        <Skeleton height={100} />
      ) : direcciones.length === 0 ? (
        <EmptyState icon={<MapPin size={24} />} title="Sin direcciones guardadas" actionLabel="Agregar dirección" onAction={() => setFormOpen(true)} />
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
              <button onClick={() => setEliminando(d.id)} aria-label="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <DireccionForm
        open={formOpen}
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

function DireccionForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [alias, setAlias] = useState("Casa");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  const guardar = async () => {
    if (!municipio.trim() || !direccion.trim()) return toast.show("Completa municipio y dirección.", "warning");
    setGuardando(true);
    try {
      await direccionesApi.crear({ alias, municipio, direccion, referencia: referencia || null, departamento: "San Salvador", lat: null, lng: null, es_principal: esPrincipal ? 1 : 0 });
      setAlias("Casa");
      setMunicipio("");
      setDireccion("");
      setReferencia("");
      setEsPrincipal(false);
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nueva dirección">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Casa, Trabajo…" />
        <Input label="Municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="San Salvador" />
        <Input label="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, avenida, número" />
        <Input label="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Casa color celeste, portón negro" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} /> Usar como dirección principal
        </label>
        <Button fullWidth onClick={guardar} loading={guardando}>
          Guardar dirección
        </Button>
      </div>
    </Sheet>
  );
}
