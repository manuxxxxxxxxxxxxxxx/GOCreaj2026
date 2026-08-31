import { useEffect, useState } from "react";
import { Storefront, Trash } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { CATEGORIAS, CATEGORIA_LABEL } from "../../lib/categoryIcons";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

export function AdminProductos() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [categoria, setCategoria] = useState("");
  const [eliminando, setEliminando] = useState<Producto | null>(null);
  const toast = useToast();

  const cargar = () => {
    adminApi.productos(categoria || undefined).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
  };

  useEffect(cargar, [categoria]);

  const toggleActivo = async (p: Producto) => {
    try {
      await adminApi.actualizarProducto({ producto_id: p.id, activo: p.activo ? 0 : 1 });
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Productos</h1>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px", fontSize: 13, background: "var(--surface-1)" }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {productos === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={160} radius="var(--radius-md)" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <EmptyState icon={<Storefront size={24} />} title="Sin productos" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {productos.map((p) => (
            <div key={p.id} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ height: 100, background: "var(--surface-2)", position: "relative" }}>
                {p.imagen && <img src={p.imagen} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.activo ? 1 : 0.4 }} />}
                <button onClick={() => setEliminando(p)} aria-label="Ocultar producto" style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Trash size={12} />
                </button>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.tienda_nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700 }}>{money(p.precio)}</span>
                  <button
                    onClick={() => toggleActivo(p)}
                    style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer", background: p.activo ? "var(--ok-bg)" : "var(--surface-2)", color: p.activo ? "var(--ok-ink)" : "var(--text-muted)" }}
                  >
                    {p.activo ? "Activo" : "Oculto"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!eliminando}
        title="¿Ocultar este producto?"
        description="Dejará de aparecer en la tienda, pero no se elimina permanentemente."
        danger
        confirmLabel="Ocultar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (!eliminando) return;
          await adminApi.eliminarProducto(eliminando.id);
          setEliminando(null);
          cargar();
        }}
      />
    </div>
  );
}
