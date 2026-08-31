import { useEffect, useState } from "react";
import { Plus, Tag, Trash } from "@phosphor-icons/react";
import { cuponesApi, ApiError } from "../../lib/api";
import type { Cupon } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export function AdminCupones() {
  const [cupones, setCupones] = useState<Cupon[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [eliminando, setEliminando] = useState<Cupon | null>(null);

  const cargar = () => {
    cuponesApi.listar().then((r) => setCupones(r.cupones)).catch(() => setCupones([]));
  };

  useEffect(cargar, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Cupones</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} /> Nuevo cupón
        </Button>
      </div>

      {cupones === null ? (
        <Skeleton height={200} />
      ) : cupones.length === 0 ? (
        <EmptyState icon={<Tag size={24} />} title="Sin cupones" actionLabel="Crear cupón" onAction={() => setFormOpen(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cupones.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, background: "var(--cyan-bg)", color: "var(--cyan)", padding: "4px 10px", borderRadius: "var(--radius-sm)" }}>{c.codigo}</div>
              <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)" }}>
                {c.tipo === "porcentaje" ? `${c.valor}% de descuento` : `$${c.valor} de descuento`} · min. ${c.min_compra}
                {c.expira_at && ` · vence ${formatDate(c.expira_at)}`}
              </div>
              <div className="tabular" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {c.usos_actuales}
                {c.usos_max ? `/${c.usos_max}` : ""} usos
              </div>
              <button
                onClick={() => cuponesApi.toggleActivo(c.id).then(cargar)}
                style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer", background: c.activo ? "var(--ok-bg)" : "var(--surface-2)", color: c.activo ? "var(--ok-ink)" : "var(--text-muted)" }}
              >
                {c.activo ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => setEliminando(c)} aria-label="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <CuponForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); cargar(); }} />

      <ConfirmDialog
        open={!!eliminando}
        title="¿Eliminar cupón?"
        description="Los compradores ya no podrán usar este código."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (!eliminando) return;
          await cuponesApi.eliminar(eliminando.id);
          setEliminando(null);
          cargar();
        }}
      />
    </div>
  );
}

function CuponForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [valor, setValor] = useState("");
  const [minCompra, setMinCompra] = useState("0");
  const [usosMax, setUsosMax] = useState("");
  const [expiraAt, setExpiraAt] = useState("");
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  const guardar = async () => {
    if (!codigo.trim() || !valor) return toast.show("Completa código y valor.", "warning");
    setGuardando(true);
    try {
      await cuponesApi.crear({ codigo: codigo.toUpperCase(), tipo, valor: Number(valor), min_compra: Number(minCompra) || 0, usos_max: usosMax ? Number(usosMax) : undefined, expira_at: expiraAt || undefined });
      setCodigo("");
      setValor("");
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo crear el cupón.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo cupón">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="BIENVENIDO10" />
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "porcentaje" | "monto")} style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 12px", fontSize: 14, background: "var(--surface-1)" }}>
            <option value="porcentaje">Porcentaje</option>
            <option value="monto">Monto fijo</option>
          </select>
        </div>
        <Input label={tipo === "porcentaje" ? "Porcentaje (%)" : "Monto ($)"} type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Input label="Compra mínima ($)" type="number" value={minCompra} onChange={(e) => setMinCompra(e.target.value)} />
        <Input label="Usos máximos (opcional)" type="number" value={usosMax} onChange={(e) => setUsosMax(e.target.value)} />
        <Input label="Expira (opcional)" type="date" value={expiraAt} onChange={(e) => setExpiraAt(e.target.value)} />
        <Button fullWidth onClick={guardar} loading={guardando}>
          Crear cupón
        </Button>
      </div>
    </Sheet>
  );
}
