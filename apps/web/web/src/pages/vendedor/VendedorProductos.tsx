import { useEffect, useState } from "react";
import { FilmSlate, Infinity, Pencil, Plus, Storefront } from "@phosphor-icons/react";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Producto, Tienda } from "../../lib/types";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { PriceInput } from "../../components/ui/PriceInput";
import { MultiImagePicker } from "../../components/domain/MultiImagePicker";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { SubirReelSheet } from "../../components/domain/SubirReelSheet";

export function VendedorProductos() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [tiendas, setTiendas] = useState<Tienda[] | null>(null);
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [subiendoReel, setSubiendoReel] = useState(false);

  const cargar = () => {
    vendedorApi.misProductos().then((r) => setProductos(r.productos)).catch(() => setProductos([]));
  };

  useEffect(() => {
    cargar();
    vendedorApi.misTiendas().then((r) => setTiendas(r.tiendas)).catch(() => setTiendas([]));
  }, []);

  if (tiendas !== null && tiendas.length === 0) {
    return <EmptyState icon={<Storefront size={26} />} title="Primero crea tu tienda" description="Necesitas una tienda antes de publicar productos." actionLabel="Ir a Mi tienda" onAction={() => (window.location.href = "/vendedor/tienda")} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Productos</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => setSubiendoReel(true)} disabled={!tiendas?.length}>
            <FilmSlate size={16} color="var(--violet)" /> Nuevo Reel
          </Button>
          <Button variant="secondary" onClick={() => setEditando("nuevo")} disabled={!tiendas?.length}>
            <Plus size={16} color="var(--cyan)" /> Nuevo producto
          </Button>
        </div>
      </div>

      {productos === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={160} radius="var(--radius-md)" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <EmptyState icon={<Storefront size={24} />} title="Sin productos todavía" actionLabel="Crear producto" onAction={() => setEditando("nuevo")} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditando(p)}
              style={{ textAlign: "left", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "pointer" }}
            >
              <div style={{ height: 110, background: "var(--surface-2)", position: "relative" }}>
                {p.imagen && <img src={p.imagen} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.activo ? 1 : 0.5 }} />}
                {p.estado_stock === "agotado" && (
                  <span style={{ position: "absolute", top: 8, left: 8, background: "var(--danger)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>AGOTADO</span>
                )}
                <span style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil size={12} color="#fff" />
                </span>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="tabular" style={{ fontWeight: 700, fontSize: 13 }}>{money(p.precio_oferta || p.precio)}</span>
                  <span className="tabular" style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.stock_ilimitado ? "Ilimitado" : `Stock: ${p.stock}`}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {editando && tiendas && (
        <ProductoForm
          producto={editando === "nuevo" ? null : editando}
          tiendaId={tiendas[0]?.id}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}

      {subiendoReel && (
        <SubirReelSheet
          onClose={() => setSubiendoReel(false)}
          onPublicado={() => {
            setSubiendoReel(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ProductoForm({ producto, tiendaId, onClose, onSaved }: { producto: Producto | null; tiendaId?: number; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [precio, setPrecio] = useState(producto?.precio ?? 0);
  const [precioOferta, setPrecioOferta] = useState(producto?.precio_oferta ?? 0);
  const [stockIlimitado, setStockIlimitado] = useState(!!producto?.stock_ilimitado);
  const [stock, setStock] = useState(String(producto?.stock ?? "0"));
  const [categoria, setCategoria] = useState(producto?.categoria ?? "comida");
  const [imagenes, setImagenes] = useState<string[]>(producto?.imagenes && producto.imagenes.length ? producto.imagenes : producto?.imagen ? [producto.imagen] : []);
  const [activo, setActivo] = useState(producto?.activo !== 0);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  const guardar = async () => {
    if (!nombre.trim() || !precio) return toast.show("Nombre y precio son obligatorios.", "warning");
    if (imagenes.length === 0) return toast.show("Agrega al menos una foto.", "warning");
    setGuardando(true);
    try {
      if (producto) {
        await vendedorApi.actualizarProducto({
          producto_id: producto.id,
          nombre,
          descripcion,
          precio,
          precio_oferta: precioOferta || undefined,
          quitar_oferta: !precioOferta,
          stock_ilimitado: stockIlimitado,
          stock: stockIlimitado ? 0 : Number(stock),
          categoria,
          activo: activo ? 1 : 0,
          // Siempre se manda la galería completa (URLs existentes + fotos nuevas en base64)
          // -- así una foto que se quitó de la lista también se quita al guardar.
          imagenes,
        });
        toast.show("Producto actualizado", "success");
      } else {
        if (!tiendaId) return;
        await vendedorApi.crearProducto({
          tienda_id: tiendaId,
          nombre,
          descripcion,
          precio,
          precio_oferta: precioOferta || undefined,
          stock_ilimitado: stockIlimitado,
          stock: stockIlimitado ? 0 : Number(stock),
          categoria,
          imagenes,
        });
        toast.show("Producto creado", "success");
      }
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar el producto.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={producto ? "Editar producto" : "Nuevo producto"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Fotos (hasta 10)</label>
          <MultiImagePicker imagenes={imagenes} onChange={setImagenes} />
        </div>
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <PriceInput label="Precio" value={precio} onChange={setPrecio} />
          </div>
          <div style={{ flex: 1 }}>
            <PriceInput label="Precio oferta (opcional)" value={precioOferta} onChange={setPrecioOferta} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Inventario</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStockIlimitado(false)}
              style={{ flex: 1, padding: "10px 4px", borderRadius: "var(--radius-md)", border: `1px solid ${!stockIlimitado ? "var(--cyan)" : "var(--border)"}`, background: !stockIlimitado ? "var(--cyan-bg)" : "var(--surface-1)", color: !stockIlimitado ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              Cantidad limitada
            </button>
            <button
              type="button"
              onClick={() => setStockIlimitado(true)}
              style={{ flex: 1, padding: "10px 4px", borderRadius: "var(--radius-md)", border: `1px solid ${stockIlimitado ? "var(--cyan)" : "var(--border)"}`, background: stockIlimitado ? "var(--cyan-bg)" : "var(--surface-1)", color: stockIlimitado ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              <Infinity size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Stock ilimitado
            </button>
          </div>
          {!stockIlimitado && <Input label="Cantidad disponible" type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ marginTop: 10 }} />}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Categoría</label>
          <CategoryPicker value={categoria} onChange={setCategoria} />
        </div>
        {producto && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Producto visible en la tienda
          </label>
        )}
        <Button fullWidth onClick={guardar} loading={guardando}>
          {producto ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </Sheet>
  );
}
